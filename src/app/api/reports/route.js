import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';


// Helper function to generate qualitative insights based on weekly metrics
function generateInsights({ completionRate, domains, plannedHours, actualHours, growthConsistency, missedCount }) {
  const insights = [];

  if (completionRate >= 80)
    insights.push({ type: 'positive', icon: '🎯', text: `Strong week — ${completionRate}% completion rate. You stayed on plan.` });
  else if (completionRate >= 50)
    insights.push({ type: 'info', icon: '📊', text: `Moderate completion at ${completionRate}%. A few tasks slipped — consider smaller task sizes next week.` });
  else
    insights.push({ type: 'warning', icon: '⚠️', text: `Only ${completionRate}% of planned tasks completed. Heavy overplanning or unexpected interruptions detected.` });

  if (plannedHours > 0 && actualHours > 0) {
    const ratio = actualHours / plannedHours;
    if (ratio < 0.6)
      insights.push({ type: 'warning', icon: '⏱️', text: `You completed ${Math.round(ratio * 100)}% of planned hours. Your duration estimates may be too optimistic.` });
    else if (ratio > 1.2)
      insights.push({ type: 'info', icon: '⏰', text: `Tasks took ${Math.round((ratio - 1) * 100)}% longer than estimated. Consider padding future estimates.` });
  }

  const domainNames = domains.map((d) => d.domain);
  const missing = ['Work/Study', 'Personal Growth', 'Health', 'Life Admin'].filter(
    (d) => !domainNames.includes(d)
  );
  if (missing.length > 0)
    insights.push({ type: 'warning', icon: '⚖️', text: `No tasks completed in: ${missing.join(', ')}. Aim for at least one task per domain weekly.` });

  if (growthConsistency < 40)
    insights.push({ type: 'warning', icon: '🌱', text: `Growth consistency at ${growthConsistency}%. Personal Growth tasks are being consistently deprioritised.` });
  else if (growthConsistency >= 90)
    insights.push({ type: 'positive', icon: '🌟', text: `Excellent growth consistency at ${growthConsistency}%! You hit your personal development target.` });

  if (missedCount > 0)
    insights.push({ type: 'info', icon: '🔄', text: `${missedCount} task${missedCount > 1 ? 's' : ''} missed this week. Use the reschedule panel to carry them forward.` });

  return insights.slice(0, 5);
}




// Helper function to provide actionable advice based on performance trends
function generateSuggestions(completionRate, domains, growthConsistency, missedCount, realismFactor) {
  const suggestions = [];
  const safeDomains = Array.isArray(domains) ? domains : [];

  if (completionRate < 60)
    suggestions.push('Try limiting your weekly sprint to 70% of your total available capacity to allow for interruptions.');
  if (growthConsistency < 50)
    suggestions.push('Block a fixed 1-hour "growth slot" in your calendar on Monday morning to ensure progress.');

  const healthDomain = safeDomains.find(d => d.domain === 'Health');
  if (!healthDomain || (healthDomain.completedHours ?? 0) < 1)
    suggestions.push('Health tasks were neglected. Schedule at least one physical activity for next week.');

  if (missedCount > 3)
    suggestions.push('You had multiple missed tasks; try breaking down your larger tasks into 30-minute sub-tasks.');

  if (realismFactor < 0.6)
    suggestions.push('Your realism factor is low. Start adding a 20% "buffer" to your estimated task durations.');

  return suggestions.slice(0, 4);
}



// Handler for retrieving existing reports (single or list)
export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const uid = user.userId ?? user.userid ?? user.id;
    const { searchParams } = new URL(request.url);
    const weekstart = searchParams.get('weekstart');

    if (weekstart) {
      const res = await query(
        `SELECT id, week_start_date, metrics, domain_breakdown,
                insights, growth_data, suggestions, created_at, updated_at
         FROM reports
         WHERE user_id = $1 AND week_start_date = $2
         LIMIT 1`,
        [uid, weekstart]
      );

      if (res.rows.length === 0) return NextResponse.json({ success: true, data: null });

      const r = res.rows[0];
      return NextResponse.json({
        success: true,
        data: {
          id: r.id,
          weekStartDate: r.weekStartDate,
          metrics: r.metrics || {},
          domainBreakdown: r.domainBreakdown || [],
          insights: r.insights || [],
          growthData: r.growthData || {},
          suggestions: r.suggestions || [],
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        },
      });
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(20, parseInt(searchParams.get('limit') || '10'));
    const offset = (page - 1) * limit;

    const countRes = await query('SELECT COUNT(*) as count FROM reports WHERE user_id = $1', [uid]);
    const total = parseInt(countRes.rows[0].count);

    const reportsRes = await query(
      `SELECT id, week_start_date, metrics, domain_breakdown,
              insights, growth_data, suggestions, created_at, updated_at
       FROM reports
       WHERE user_id = $1
       ORDER BY week_start_date DESC 
       LIMIT $2 OFFSET $3`,
      [uid, limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: reportsRes.rows.map((r) => ({
        id: r.id,
        weekStartDate: r.weekStartDate,
        metrics: r.metrics || {},
        domainBreakdown: r.domainBreakdown || [],
        insights: r.insights || [],
        growthData: r.growthData || {},
        suggestions: r.suggestions || [],
        createdAt: r.createdAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[Reports GET]', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}



// Handler for generating and storing a new weekly performance report
export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const uid = user.userid ?? user.userId ?? user.id;

    let body = {};
    try { body = await request.json(); } catch (_) { }


    // Default to the current week's Monday if no start date is provided
    const weekStartStr = body.weekstartdate ?? body.weekStartDate ?? (() => {
      const d = new Date();
      const day = d.getDay();
      const diff = day === 0 ? 6 : day - 1;  // Mon=0 offset
      d.setDate(d.getDate() - diff);
      d.setHours(0, 0, 0, 0);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    })();


    const [y, mo, dy] = weekStartStr.split('-').map(Number);
    const endDate = new Date(y, mo - 1, dy + 7);
    const weekEndStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    console.log(`DEBUG: Running report for ${weekStartStr} to ${weekEndStr}`);


    // Query total planned vs completed tasks and duration minutes for the week
    const completionRes = await query(
      `SELECT
     COUNT(*) AS tasksplanned,
     COUNT(*) FILTER (WHERE LOWER(status) = 'completed') AS taskscompleted,
     COALESCE(SUM(duration), 0) AS plannedminutes,
     COALESCE(SUM(COALESCE(actual_duration, duration)) FILTER (WHERE LOWER(status) = 'completed'), 0) AS actualminutes
   FROM tasks
   WHERE user_id = $1
     AND (
       (LOWER(status) = 'completed' AND completed_at >= $2 AND completed_at < $3)
       OR
       (LOWER(status) != 'completed' AND created_at >= $2 AND created_at < $3)
     )`,
      [uid, weekStartStr, weekEndStr]
    );

    const cm = completionRes.rows[0] || {};
    const tasksPlanned = parseInt(cm.tasksplanned || 0);
    const tasksCompleted = parseInt(cm.taskscompleted || 0);
    const hoursPlanned = Math.round((parseInt(cm.plannedminutes) / 60) * 10) / 10;
    const hoursActual = Math.round((parseInt(cm.actualminutes) / 60) * 10) / 10;
    const completionRate = tasksPlanned > 0 ? Math.round((tasksCompleted / tasksPlanned) * 100) : 0;


    // Break down task performance metrics by domain (category)
    const domainRes = await query(
      `SELECT
     domain,
     COUNT(*) AS tasksplanned,
     COUNT(*) FILTER (WHERE LOWER(status) = 'completed') AS taskscompleted,
     COALESCE(SUM(duration), 0) AS plannedmins,
     COALESCE(SUM(duration) FILTER (WHERE LOWER(status) = 'completed'), 0) AS completedmins
   FROM tasks
   WHERE user_id = $1
     AND (
       (LOWER(status) = 'completed' AND completed_at >= $2 AND completed_at < $3)
       OR
       (LOWER(status) != 'completed' AND created_at >= $2 AND created_at < $3)
     )
   GROUP BY domain
   ORDER BY domain`,
      [uid, weekStartStr, weekEndStr]
    );
    const safeDomains = (domainRes.rows || []).map(r => ({
      domain: r.domain || 'Unknown',
      planned: parseInt(r.tasksplanned),
      completed: parseInt(r.taskscompleted),
      plannedHours: Math.round((parseInt(r.plannedmins) / 60) * 10) / 10,
      completedHours: Math.round((parseInt(r.completedmins) / 60) * 10) / 10,
    }));


    // Count tasks that were scheduled but neither completed nor explicitly cancelled
    const missedRes = await query(
      `SELECT COUNT(*) AS count FROM schedules s JOIN tasks t ON t.id = s.task_id
       WHERE s.user_id = $1 AND s.scheduled_slot < NOW() AND LOWER(t.status) NOT IN ('completed', 'cancelled')`,
      [uid]
    );
    const missedCount = parseInt(missedRes.rows[0]?.count || 0);

    const growthTargetRes = await query(`SELECT growth_target_hours AS target FROM users WHERE id = $1`, [uid]);
    const growthTarget = parseFloat(growthTargetRes.rows[0]?.target || 5);

    const growthActualRes = await query(
      `SELECT COALESCE(SUM(COALESCE(actual_duration, duration)), 0) AS mins FROM tasks
       WHERE user_id = $1 AND LOWER(domain) = 'personal growth' AND LOWER(status) = 'completed'
       AND completed_at >= $2 AND completed_at < $3`,
      [uid, weekStartStr, weekEndStr]
    );
    // Evaluate adherence to the personal growth hour target
    const growthActualHours = Math.round((parseInt(growthActualRes.rows[0]?.mins || 0) / 60) * 10) / 10;
    const growthConsistency = Math.min(100, Math.round((growthActualHours / growthTarget) * 100));


    const realismRes = await query(
      `SELECT COALESCE(SUM(planned_duration), 0) as p, COALESCE(SUM(actual_duration), 0) as a 
       FROM logs WHERE user_id = $1 AND action_type = 'task_completed' AND created_at > NOW() - INTERVAL '30 days'`,
      [uid]
    );
    const rf = realismRes.rows[0];
    // Calculate recent estimation accuracy (realism factor) from task completion logs
    const realismFactor = parseInt(rf.p) > 0 ? Math.max(0.5, Math.min(0.95, parseInt(rf.a) / parseInt(rf.p))) : 0.7;


    const insights = generateInsights({
      completionRate, domains: safeDomains, plannedHours: hoursPlanned,
      actualHours: hoursActual, growthConsistency, missedCount
    });

    const suggestions = generateSuggestions(completionRate, safeDomains, growthConsistency, missedCount, realismFactor);

    const metrics = { tasksPlanned, tasksCompleted, completionRate, hoursPlanned, hoursActual, missedTasks: missedCount };
    const growthData = { targetHours: growthTarget, completedHours: growthActualHours, consistencyScore: growthConsistency };

    // Persist the report data using an upsert to avoid duplicate weekly entries
    const upsertRes = await query(
      `INSERT INTO reports (user_id, week_start_date, metrics, domain_breakdown, insights, growth_data, suggestions, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
       ON CONFLICT (user_id, week_start_date) DO UPDATE SET
       metrics = EXCLUDED.metrics, domain_breakdown = EXCLUDED.domain_breakdown, insights = EXCLUDED.insights, 
       growth_data = EXCLUDED.growth_data, suggestions = EXCLUDED.suggestions, updated_at = NOW()
       RETURNING id, week_start_date, created_at`,
      [uid, weekStartStr, JSON.stringify(metrics), JSON.stringify(safeDomains), JSON.stringify(insights), JSON.stringify(growthData), JSON.stringify(suggestions)]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: upsertRes.rows[0].id,
        weekStartDate: upsertRes.rows[0].weekStartDate,
        metrics,
        domainBreakdown: safeDomains,
        insights,
        growthData,
        suggestions
      }
    });
  } catch (error) {
    console.error('Reports POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}