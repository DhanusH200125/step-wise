import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const uid = user.userId ?? user.userid ?? user.id;
    console.log('DEBUG capacity uid:', uid, 'user object:', JSON.stringify(user));

    // Retrieve user preferences to determine "Quiet Hours" (sleep/personal time)
    const prefsRes = await query('SELECT preferences FROM users WHERE id = $1', [uid]);
    const prefs = prefsRes.rows[0]?.preferences || {};

    const qStart = parseInt(prefs.quiethoursstart ?? '2300');
    const qEnd = parseInt(prefs.quiethoursend ?? '0600');

    // Calculates the number of minutes in the quiet period, handling overnight spans
    function quietMinutesPerDay(startHHMM, endHHMM) {
      const startMins = Math.floor(startHHMM / 100) * 60 + (startHHMM % 100);
      const endMins = Math.floor(endHHMM / 100) * 60 + (endHHMM % 100);
      if (startMins > endMins) return (24 * 60 - startMins) + endMins;
      return endMins - startMins;
    }

    const quietMinsPerDay = quietMinutesPerDay(qStart, qEnd);
    const quietHoursPerDay = quietMinsPerDay / 60;
    const totalQuietHours = quietHoursPerDay * 7;


    // Fetch only recurring routines (week_date IS NULL) for capacity calculation
    const routinesResult = await query(
      'SELECT * FROM routines WHERE user_id = $1 AND (week_date IS NULL OR week_date IS NOT DISTINCT FROM NULL)',
      [uid]
    );
    const routines = routinesResult.rows;
    console.log('DEBUG routines count:', routines.length);
    console.log('DEBUG first routine:', JSON.stringify(routines[0]));

    const dayCommittedHours = [0, 0, 0, 0, 0, 0, 0];
    let totalCommittedMinutes = 0;

    // Calculate total committed time by iterating through all defined routines
    routines.forEach(routine => {
      const st = routine.startTime;
      const et = routine.endTime;
      const dow = routine.dayOfWeek;
      if (!st || !et || dow === undefined) return;

      const [sh, sm] = st.substring(0, 5).split(':').map(Number);
      const [eh, em] = et.substring(0, 5).split(':').map(Number);
      let dur = (eh * 60 + em) - (sh * 60 + sm);
      if (dur < 0) dur += 1440;
      if (dur <= 0) return;

      dayCommittedHours[dow] += dur / 60;
      totalCommittedMinutes += dur;
    });

    // Base capacity calculation: 168 total hours minus quiet time and fixed routines
    const totalhours = 168 - totalQuietHours;
    const totalCommittedHours = totalCommittedMinutes / 60;
    const totalFreeHours = totalhours - totalCommittedHours;


    let realismFactor = 0.7;
    let realismSource = 'default';

    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const completionStatsRes = await query(
      `SELECT
         COALESCE(SUM(COALESCE(actual_duration, duration)), 0) AS completedminutes,
         COALESCE(SUM(duration), 0) AS plannedminutes
       FROM tasks
       WHERE user_id = $1
         AND LOWER(status) = 'completed'
         AND completed_at >= $2`,
      [uid, fourWeeksAgo.toISOString()]
    );

    const completedMinutes = parseFloat(completionStatsRes.rows[0]?.completedminutes || 0);
    const plannedMinutes = parseFloat(completionStatsRes.rows[0]?.plannedminutes || 0);

    // Compute Realism Factor based on historical task completion vs planning accuracy (last 4 weeks)
    if (plannedMinutes > 0) {
      realismFactor = Math.max(0.5, Math.min(0.75, completedMinutes / plannedMinutes));
      realismSource = 'computed';
    }

    const realisticCapacityHours = totalFreeHours * realismFactor;


    // Generate daily capacity map (0=Sun..6=Sat) adjusted by the realism factor
    const daycapacity = Array.from({ length: 7 }, (_, dow) => {
      const committed = dayCommittedHours[dow] || 0;
      const wakeHoursPerDay = 24 - quietHoursPerDay;
      const free = Math.max(0, wakeHoursPerDay - committed);
      return Math.round(free * realismFactor * 100) / 100;
    });

    const scheduledRes = await query(
      `SELECT COALESCE(SUM(t.duration), 0) AS scheduledmins
       FROM schedules s
       JOIN tasks t ON t.id = s.task_id
       WHERE s.user_id = $1
         AND s.scheduled_slot >= NOW()
         AND s.scheduled_slot <  NOW() + INTERVAL '7 days'`,
      [uid]
    );
    // Calculate current week's load by comparing scheduled tasks against realistic capacity
    const scheduledMins = parseInt(scheduledRes.rows[0]?.scheduledmins || 0);
    const loadPercent = realisticCapacityHours > 0
      ? Math.min(100, Math.round((scheduledMins / 60) / realisticCapacityHours * 100))
      : 0;

    return NextResponse.json({
      totalhours: Math.round(totalhours * 100) / 100,
      quiethoursperday: Math.round(quietHoursPerDay * 100) / 100,
      totalcommitted: Math.round(totalCommittedHours * 100) / 100,
      fixedblocks: Math.round(totalCommittedHours * 100) / 100,
      fixedblocksminutes: totalCommittedMinutes,
      totalfree: Math.round(totalFreeHours * 100) / 100,
      realismfactor: Math.round(realismFactor * 10000) / 10000,
      confidence: Math.round(realismFactor * 100),
      realismsource: realismSource,
      realisticcapacity: Math.round(realisticCapacityHours * 100) / 100,
      load: loadPercent,
      scheduledminutes: scheduledMins,
      daycommitted: dayCommittedHours.map(h => Math.round(h * 100) / 100),
      daycapacity,
      totalWeeklyMinutes: Math.round(totalhours * 60),
      committedMinutes: totalCommittedMinutes,
      realisticCapacityMinutes: Math.round(realisticCapacityHours * 60),
      adjustedCapacityMinutes: Math.round(realisticCapacityHours * 60),
    });

  } catch (error) {
    console.error('Error calculating capacity:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}