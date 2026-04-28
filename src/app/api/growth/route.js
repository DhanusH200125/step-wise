import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

// Handler for retrieving user personal growth metrics and performance history
export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }


    const userRes = await query(
      'SELECT growth_target_hours FROM users WHERE id = $1',
      [user.id]
    );
    const targetHours = userRes.rows[0]?.growth_target_hours


    const today = new Date();
    // Calculate boundaries for the current week starting from Monday
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - diffToMonday);
    currentMonday.setHours(0, 0, 0, 0);

    const weekEnd = new Date(currentMonday);
    weekEnd.setDate(currentMonday.getDate() + 7);


    const history = [];
    // Iterate backwards through the last 8 weeks to gather growth task performance
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(currentMonday);
      weekStart.setDate(currentMonday.getDate() - (i * 7));

      const weekEndRange = new Date(weekStart);
      weekEndRange.setDate(weekStart.getDate() + 7);

      // Sum up duration of completed tasks in the 'Personal Growth' domain for the week
      const res = await query(
        `SELECT COALESCE(SUM(COALESCE(actual_duration, duration)), 0) as total_minutes
         FROM tasks
         WHERE user_id = $1 
         AND domain = $2
         AND status = $3
         AND completed_at >= $4
         AND completed_at < $5`,
        [user.id, 'Personal Growth', 'completed', weekStart.toISOString(), weekEndRange.toISOString()]
      );

      const mins = parseInt(res.rows[0]?.totalminutes || 0);
      const hours = mins / 60;
      const consistency = Math.min(100, Math.round((hours / targetHours) * 100));

      history.push({
        weekStart: weekStart.toISOString().split('T')[0],
        hours: Math.round(hours * 10) / 10,
        consistency
      });
    }


    // Calculate the current consecutive streak of meeting growth targets (>=70% consistency)
    let streakWeeks = 0;

    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].consistency >= 70) {
        streakWeeks++;
      } else {
        break;
      }
    }


    const recentThree = history.slice(-3);
    const boostRecommended = recentThree.length === 3 && recentThree.every(w => w.consistency < 70);


    const capacityRes = await query(
      `SELECT 
        COALESCE(SUM(
          CAST((CAST(EXTRACT(EPOCH FROM (end_time - start_time)) AS INTEGER) / 60) AS NUMERIC)
        ), 0) as committed_minutes
       FROM routines WHERE user_id = $1`,
      [user.id]
    );

    // Assess current weekly capacity versus planned tasks to detect potential overload
    const committedMinutes = parseFloat(capacityRes.rows[0]?.committed_minutes || 0);
    const totalMinutesInWeek = 168 * 60;
    const freeMinutes = totalMinutesInWeek - committedMinutes;
    const capacityMinutes = freeMinutes * 0.7;

    const plannedRes = await query(
      `SELECT COALESCE(SUM(t.duration), 0) as total_minutes
       FROM schedules s
       JOIN tasks t ON s.task_id = t.id
       WHERE s.user_id = $1
       AND s.scheduled_slot >= $2
       AND s.scheduled_slot < $3`,
      [user.id, currentMonday.toISOString(), weekEnd.toISOString()]
    );

    const planned_minutes = parseInt(plannedRes.rows[0]?.total_minutes || 0);
    const overloadWeek = planned_minutes > (capacityMinutes * 0.9);


    // Generate dynamic suggestions based on performance and workload
    let suggestion = null;
    if (boostRecommended) {
      suggestion = "You've been below your growth target for 3 weeks. Try blocking a protected 1-hour slot on your lightest day.";
    } else if (overloadWeek) {
      suggestion = `Heavy week detected. Consider a temporary growth target of 3 hours instead of ${targetHours}.`;
    }

    const currentWeekData = history[history.length - 1];

    return Response.json({
      success: true,
      data: {
        target_hours: targetHours,
        completed_hours: currentWeekData.hours,
        consistency_score: currentWeekData.consistency,
        streak_weeks: streakWeeks,
        boost_recommended: boostRecommended,
        overload_week: overloadWeek,

        history: [...history].reverse(),
        suggestion
      }
    });

  } catch (error) {
    console.error('Error getting growth data:', error);
    return Response.json(
      { success: false, error: 'Failed to get growth data' },
      { status: 500 }
    );
  }
}