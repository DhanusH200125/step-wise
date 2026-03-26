import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

// Handler for retrieving aggregated dashboard analytics for a specific week
export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });

    const uid = user.userId ?? user.userid ?? user.id;
    if (!uid) return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });

    const searchParams = new URL(request.url).searchParams;
    const weekStartStr = searchParams.get('week_start') || searchParams.get('weekstart');

    // Calculate the start and end boundaries of the target week
    const weekStart = weekStartStr ? new Date(weekStartStr) : new Date();
    if (!weekStartStr) {
      const day = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
      weekStart.setHours(0, 0, 0, 0);
    }
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const wStart = weekStart.toISOString();
    const wEnd = weekEnd.toISOString();


    // Fetch task completion counts and rates for the requested week
    const completionRes = await query(
      `SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE LOWER(status) = 'completed') AS completed,
    COUNT(*) FILTER (WHERE LOWER(status) != 'completed') AS pending
   FROM tasks
   WHERE user_id = $1
     AND (
       (LOWER(status) = 'completed' AND completed_at >= $2 AND completed_at < $3)
       OR
       (LOWER(status) != 'completed' AND created_at >= $2 AND created_at < $3)
     )`,
      [uid, wStart, wEnd]
    );

    const cr = completionRes.rows[0];
    const total = parseInt(cr?.total || 0);
    const completed = parseInt(cr?.completed || 0);
    const pending = parseInt(cr?.pending || 0);
    const completionRate = total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;


    // Aggregate task distribution and time spent across different domains
    const domainRes = await query(
      `SELECT domain,
              COUNT(*) AS taskcount,
              SUM(duration) AS totalminutes,
              SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) AS completedcount
       FROM tasks
       WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
       GROUP BY domain`,
      [uid, wStart, wEnd]
    );
    const domains = domainRes.rows.map(r => ({
      domain: r.domain,
      minutes: parseInt(r.totalminutes || 0),
      hours: Math.round(parseInt(r.totalminutes || 0) / 60 * 10) / 10,
      taskCount: parseInt(r.taskcount || 0),
      completedCount: parseInt(r.completedcount || 0),
    }));


    // Fetch daily completion counts for trend visualization
    const dailyRes = await query(
      `SELECT DATE(completed_at) AS day, COUNT(*) AS count
       FROM tasks
       WHERE user_id = $1 AND LOWER(status) = 'completed'
         AND completed_at >= $2 AND completed_at < $3
       GROUP BY DATE(completed_at)
       ORDER BY day`,
      [uid, wStart, wEnd]
    );
    const dailycompletion = dailyRes.rows
      .filter(r => r.day)
      .map(r => ({ day: r.day, count: parseInt(r.count) }));


    // Compare planned versus actual hours using scheduled task logs
    const pvaRes = await query(
      `SELECT
        DATE(s.scheduled_slot AT TIME ZONE 'Asia/Kolkata') AS day,
        COALESCE(SUM(t.duration), 0)                       AS plannedmins,
        COALESCE(SUM(COALESCE(t.actual_duration, t.duration)), 0) AS actualmins
       FROM schedules s
       JOIN tasks t ON t.id = s.task_id
       WHERE s.user_id = $1
         AND s.scheduled_slot >= $2
         AND s.scheduled_slot <  $3
       GROUP BY DATE(s.scheduled_slot AT TIME ZONE 'Asia/Kolkata')
       ORDER BY day`,
      [uid, wStart, wEnd]
    );
    const plannedvsactual = pvaRes.rows.map(r => ({
      day: r.day,
      plannedhours: Math.round(parseInt(r.plannedmins || 0) / 60 * 10) / 10,
      actualhours: Math.round(parseInt(r.actualmins || 0) / 60 * 10) / 10,
    }));


    const fourWeeksAgo = new Date(weekEnd);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    // Fetch data for a 24-hour heatmap showing peak task completion periods
    const heatRes = await query(
      `SELECT
        EXTRACT(DOW  FROM completed_at AT TIME ZONE 'Asia/Kolkata')::int AS day,
        EXTRACT(HOUR FROM completed_at AT TIME ZONE 'Asia/Kolkata')::int AS hour,
        COUNT(*) AS completions
       FROM tasks
       WHERE user_id = $1 AND LOWER(status) = 'completed'
         AND completed_at >= $2 AND completed_at < $3
       GROUP BY day, hour`,
      [uid, fourWeeksAgo.toISOString(), weekEnd.toISOString()]
    );
    const productivityheatmap = heatRes.rows.map(r => ({
      day: parseInt(r.day),
      hour: parseInt(r.hour),
      completions: parseInt(r.completions),
    }));


    const growthTargetRes = await query(
      `SELECT COALESCE(growth_target_hours, 5) AS target FROM users WHERE id = $1`,
      [uid]
    );
    const growthTarget = parseFloat(growthTargetRes.rows[0]?.target || 5);

    // Iteratively calculate personal growth performance over the last 8 weeks
    const growthRows = [];
    for (let i = 7; i >= 0; i--) {
      const ws = new Date(weekStart);
      ws.setDate(ws.getDate() - i * 7);
      const we = new Date(ws);
      we.setDate(we.getDate() + 7);

      const res = await query(
        `SELECT COALESCE(SUM(COALESCE(actual_duration, duration)), 0) AS mins
         FROM tasks
         WHERE user_id = $1 AND domain = 'Personal Growth'
           AND LOWER(status) = 'completed'
           AND completed_at >= $2 AND completed_at < $3`,
        [uid, ws.toISOString(), we.toISOString()]
      );
      const mins = parseInt(res.rows[0]?.mins || 0);
      const hours = Math.round(mins / 60 * 10) / 10;
      growthRows.push({
        week: ws.toISOString().split('T')[0],
        completions: hours,
        score: Math.min(100, Math.round((hours / growthTarget) * 100)),
      });
    }


    // Iteratively calculate general capacity utilization over the last 8 weeks
    const capRows = [];
    for (let i = 7; i >= 0; i--) {
      const ws = new Date(weekStart);
      ws.setDate(ws.getDate() - i * 7);
      const we = new Date(ws);
      we.setDate(we.getDate() + 7);

      const res = await query(
        `SELECT
       COUNT(*) FILTER (WHERE LOWER(status) = 'completed') AS completed,
       COUNT(*) FILTER (WHERE LOWER(status) != 'completed') AS unused,
       COUNT(*) AS planned
     FROM tasks
     WHERE user_id = $1
       AND created_at >= $2
       AND created_at < $3`,
        [uid, ws.toISOString(), we.toISOString()]
      );

      capRows.push({
        week: ws.toISOString().split('T')[0],
        completed: parseInt(res.rows[0]?.completed || 0),
        unused: parseInt(res.rows[0]?.unused || 0),
        planned: parseInt(res.rows[0]?.planned || 0),
      });
    }

    return Response.json({
      success: true,
      data: {
        weekStart: weekStart.toISOString().split('T')[0],
        completionRate,
        total,
        completed,
        pending,
        domains,
        dailycompletion,
        plannedvsactual,
        productivityheatmap,
        growthtrend: growthRows,
        capacityutilization: capRows,
      },
    });

  } catch (error) {
    console.error('Analytics dashboard error:', error);
    return Response.json({ success: false, error: 'Failed to fetch analytics' }, { status: 500 });
  }
}