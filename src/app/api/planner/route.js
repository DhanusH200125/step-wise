import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';


export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });

    const uid = user.userId ?? user.userid ?? user.id;
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('week_start');

    if (!weekStart) return Response.json({ success: false, error: 'week_start required' }, { status: 400 });

    // Calculate the range for the requested week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;

    // Fetch user routines to calculate available time blocks
    const routinesRes = await query(
      'SELECT * FROM routines WHERE user_id = $1 ORDER BY day_of_week, start_time',
      [uid]
    );


    // Fetch all tasks already scheduled for this specific week
    const schedulesRes = await query(
      `SELECT 
     s.id               AS schedule_id,
     s.task_id          AS task_id,
     TO_CHAR(s.scheduled_slot AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD"T"HH24:MI:SS') AS scheduled_slot,
     s.locked_flag      AS locked_flag,
     s.score            AS score,
     s.score_breakdown  AS score_breakdown,
     s.status           AS schedule_status,
     t.title, t.domain, t.priority, t.energy, t.duration
   FROM schedules s
   JOIN tasks t ON s.task_id = t.id
   WHERE s.user_id = $1
   AND s.scheduled_slot::date >= $2::date
   AND s.scheduled_slot::date <  $3::date
   ORDER BY s.scheduled_slot`,
      [uid, weekStart, weekEndStr]
    );

    // Calculate theoretical free time by subtracting routine duration from total week time
    const capacityRes = await query(
      `SELECT (168 * 60) - COALESCE(SUM(
          CAST(EXTRACT(EPOCH FROM (end_time::time - start_time::time)) / 60 AS INTEGER)
        ), 0) AS free_minutes
       FROM routines WHERE user_id = $1`,
      [uid]
    );

    // Identify tasks that are eligible for scheduling but haven't been planned yet
    const unscheduledRes = await query(
      `SELECT id, title, domain, priority, duration 
   FROM tasks 
   WHERE user_id = $1 
     AND LOWER(status) IN ('pending', 'rescheduled', 'scheduled')
     AND id NOT IN (
       SELECT task_id FROM schedules 
       WHERE user_id = $1 
         AND scheduled_slot::date >= $2::date 
         AND scheduled_slot::date <  $3::date
     )`,
      [uid, weekStart, weekEndStr]
    );

    const freeMinutes = parseFloat(capacityRes.rows[0]?.free_minutes) || (168 * 60);

    return Response.json({
      success: true,
      data: {
        weekStart,
        week_end: weekEndStr,
        capacity_minutes: Math.floor(freeMinutes * 0.7),
        scheduled_tasks: schedulesRes.rows.map(s => ({
          scheduleId: s.scheduleId,
          taskId: s.taskId,
          taskTitle: s.title,
          domain: s.domain,
          priority: s.priority,
          energy: s.energy,
          duration: s.duration,
          scheduledSlot: s.scheduledSlot,
          locked: s.lockedFlag,
          score: Math.min(100, Math.round(s.score ?? 0)),
          scoreBreakdown: s.scoreBreakdown ?? {},
          status: s.scheduleStatus,
        })),
        unscheduled: unscheduledRes.rows.map(t => ({
          taskId: t.id,
          taskTitle: t.title,
          domain: t.domain,
          priority: t.priority,
          duration: t.duration,
          reason: 'Not scheduled',
        })),
      }
    });
  } catch (error) {
    console.error('GET planner error:', error);
    return Response.json({ success: false, error: 'Failed to fetch planner data' }, { status: 500 });
  }
}


export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });

    const uid = user.userId ?? user.userid ?? user.id;
    const body = await request.json();
    const weekStart = body?.weekstartdate ?? new Date().toISOString().split('T')[0];


    // Fetch routines to identify unavailable time slots
    const routinesRes = await query('SELECT * FROM routines WHERE user_id = $1', [uid]);
    const routines = routinesRes.rows;


    // Fetch all actionable tasks ordered by priority and deadline
    const tasksRes = await query(
      `SELECT * FROM tasks
       WHERE user_id = $1
       AND LOWER(status) IN ('pending', 'rescheduled', 'scheduled', 'in_progress')
       ORDER BY priority DESC, deadline ASC NULLS LAST`,
      [uid]
    );
    const tasks = tasksRes.rows;


    // Calculate total baseline capacity after accounting for fixed routines
    let committedMins = 0;
    for (const r of routines) {
      const st = r.start_time || '00:00';
      const et = r.end_time || '00:00';
      const [sh, sm] = st.substring(0, 5).split(':').map(Number);
      const [eh, em] = et.substring(0, 5).split(':').map(Number);
      const dur = (eh * 60 + em) - (sh * 60 + sm);
      if (dur > 0) committedMins += dur;
    }
    const totalCapacityMins = Math.floor((7 * 24 * 60 - committedMins) * 0.7);


    // Scoring algorithm to determine task importance for the auto-scheduler
    function scoreTask(task) {
      let score = (parseInt(task.priority) || 2) * 20;
      if (task.deadline) {
        const days = (new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24);
        if (days < 1) score += 40;
        else if (days < 3) score += 25;
        else if (days < 7) score += 10;
      }
      const e = (task.energy || '').toLowerCase();
      if (e === 'high') score += 5;
      if (e === 'medium') score += 2;
      return score;
    }

    // Rank tasks by score to prioritize them in the greedy scheduling loop
    const scored = tasks
      .map(t => ({ ...t, score: scoreTask(t) }))
      .sort((a, b) => b.score - a.score);


    // Perform greedy allocation of tasks into the week's capacity
    let remaining = totalCapacityMins;
    const sprintTasks = [];
    const unscheduledTasks = [];
    for (const task of scored) {
      const dur = parseInt(task.duration) || 30;
      if (dur <= remaining) { sprintTasks.push(task); remaining -= dur; }
      else unscheduledTasks.push(task);
    }



    const [wy, wm, wd] = weekStart.split('-').map(Number);
    const weekEndDate = new Date(wy, wm - 1, wd + 7);
    const weekEndStr = `${weekEndDate.getFullYear()}-${String(weekEndDate.getMonth() + 1).padStart(2, '0')}-${String(weekEndDate.getDate()).padStart(2, '0')}`;

    // Clear existing unlocked schedules for the week before regenerating
    await query(
      `DELETE FROM schedules
       WHERE user_id = $1
       AND scheduled_slot::date >= $2::date
       AND scheduled_slot::date <  $3::date
       AND locked_flag = false`,
      [uid, weekStart, weekEndStr]
    );



    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(wy, wm - 1, wd + i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });



    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    function toISTDateStr(dateVal) {
      if (!dateVal) return null;
      const ms = new Date(dateVal).getTime() + IST_OFFSET_MS;
      const d = new Date(ms);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    }

    // Initialize daily cursor starting at 9 AM for task placement
    const dailyCursors = Array(7).fill(9 * 60);

    const scheduled = [];

    // Distribute tasks across the week, favoring deadline adherence and load balancing
    for (const task of sprintTasks) {
      const dur = parseInt(task.duration) || 30;
      let targetDayIdx = -1;

      if (task.deadline) {
        const deadlineIST = toISTDateStr(task.deadline);
        let deadlineDayIdx = weekDays.indexOf(deadlineIST);

        if (deadlineDayIdx === -1 && deadlineIST > weekDays[6]) deadlineDayIdx = 6;

        if (deadlineDayIdx >= 0) {
          for (let di = deadlineDayIdx; di >= 0; di--) {
            if (dailyCursors[di] + dur <= 21 * 60) {
              targetDayIdx = di;
              break;
            }
          }
        }
      }

      if (targetDayIdx === -1) {
        targetDayIdx = dailyCursors.reduce(
          (best, mins, i) => (mins < dailyCursors[best] ? i : best), 0
        );
        if (dailyCursors[targetDayIdx] + dur > 21 * 60) continue;
      }

      const startMin = dailyCursors[targetDayIdx];
      const h = String(Math.floor(startMin / 60)).padStart(2, '0');
      const m = String(startMin % 60).padStart(2, '0');
      const slotDateTime = `${weekDays[targetDayIdx]}T${h}:${m}:00`;

      dailyCursors[targetDayIdx] += dur + 15;

      // Persist the new schedule slot for the task
      const res = await query(
        `INSERT INTO schedules (user_id, task_id, scheduled_slot, locked_flag, score, status)
          VALUES ($1, $2, $3, false, $4, 'scheduled') RETURNING id`,
        [uid, task.id, slotDateTime, Math.min(100, Math.round(task.score))]
      );
      await query(`UPDATE tasks SET status = 'scheduled' WHERE id = $1`, [task.id]);

      scheduled.push({
        scheduleId: res.rows[0].id,
        taskId: task.id,
        taskTitle: task.title,
        domain: task.domain,
        duration: task.duration,
        scheduledSlot: slotDateTime,
        score: task.score,
        locked: false,
        status: 'scheduled',
      });
    }


    // Log the successful generation of a new weekly plan
    try {
      await query(
        `INSERT INTO logs (user_id, action_type, metadata, created_at) VALUES ($1, $2, $3, NOW())`,
        [uid, 'plan_generated', JSON.stringify({ tasks_scheduled: scheduled.length, weekStart })]
      );
    } catch (_) { }

    return Response.json({
      success: true,
      data: {
        weekStart,
        capacity: Math.round(totalCapacityMins / 60 * 10) / 10,
        hoursplanned: Math.round((totalCapacityMins - remaining) / 60 * 10) / 10,
        scheduled,
        unscheduled: unscheduledTasks.map(t => ({
          taskId: t.id, taskTitle: t.title, domain: t.domain, reason: 'Capacity full',
        })),
      }
    });

  } catch (error) {
    console.error('POST planner error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}