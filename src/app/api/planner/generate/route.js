import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';


function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(mins) {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getDateFromWeekStart(weekStartStr, dayOffset) {
  const date = new Date(weekStartStr);
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().split('T')[0];
}

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });

    const { week_start_date } = await request.json();
    const weekStart = week_start_date || new Date().toISOString().split('T')[0];


    const routinesRes = await query('SELECT * FROM routines WHERE user_id = $1', [user.id]);
    const routines = routinesRes.rows;

    const tasksRes = await query(
      `SELECT * FROM tasks 
       WHERE user_id = $1 
       AND status IN ('pending', 'rescheduled')
       AND (deadline IS NULL OR deadline >= $2)
       ORDER BY deadline ASC, priority DESC`,
      [user.id, weekStart]
    );
    const tasks = tasksRes.rows;

    const prefsRes = await query('SELECT preferences FROM users WHERE id = $1', [user.id]);
    const preferences = prefsRes.rows[0]?.preferences || {};
    const energyProfile = preferences.energy_profile || { morning: 'high', afternoon: 'medium', evening: 'low' };
    const workingDays = preferences.working_days || [1, 2, 3, 4, 5];


    let total_committed = 0;
    for (const routine of routines) {
      const startMins = timeToMinutes(routine.start_time);
      const endMins = timeToMinutes(routine.end_time);
      total_committed += (endMins - startMins);
    }
    const total_free = (7 * 24 * 60) - total_committed;


    const logsRes = await query(
      `SELECT 
        SUM(CASE WHEN action_type = 'task_completed' THEN actual_duration ELSE 0 END) as completed,
        SUM(CASE WHEN action_type IN ('task_created', 'task_completed') THEN planned_duration ELSE 0 END) as planned
       FROM logs 
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '28 days'`,
      [user.id]
    );

    let realismFactor = 0.7;
    const logData = logsRes.rows[0];
    if (logData?.completed && logData?.planned && logData.planned > 0) {
      realismFactor = Math.max(0.5, Math.min(0.95, logData.completed / logData.planned));
    }
    const totalCapacityMins = Math.floor(total_free * realismFactor);


    const slots = [];
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const tempDate = new Date(weekStart);
      tempDate.setDate(tempDate.getDate() + dayOffset);
      const day_of_week = tempDate.getDay();
      const slotDate = tempDate.toISOString().split('T')[0];

      if (!workingDays.includes(day_of_week)) continue;

      for (let timeInMins = 0; timeInMins < 24 * 60; timeInMins += 30) {
        let isRoutine = routines.some(r =>
          r.day_of_week === day_of_week &&
          timeInMins >= timeToMinutes(r.start_time) &&
          timeInMins < timeToMinutes(r.end_time)
        );

        if (!isRoutine) {
          slots.push({
            date: slotDate,
            day: day_of_week,
            startTime: minutesToTime(timeInMins),
            startMins: timeInMins,
            status: 'free',
            energy: 'low'
          });
        }
      }
    }


    slots.forEach(slot => {
      const m = slot.startMins;
      if (m >= 360 && m < 720) slot.energy = energyProfile.morning;
      else if (m >= 720 && m < 1020) slot.energy = energyProfile.afternoon;
      else if (m >= 1020 && m < 1380) slot.energy = energyProfile.evening;
    });


    const scheduledTasks = [];
    const unscheduledTasks = [];
    let remainingCapacity = totalCapacityMins;
    const assignedDomainMins = {};

    for (const task of tasks) {
      const requiredSlots = Math.ceil(task.duration / 30);
      let bestScore = -1;
      let bestIdx = -1;

      for (let i = 0; i < slots.length - requiredSlots + 1; i++) {
        const chunk = slots.slice(i, i + requiredSlots);
        if (chunk.some(s => s.status !== 'free' || s.date !== chunk[0].date)) continue;


        const energyMatch = task.energy === chunk[0].energy ? 1.0 : 0.5;
        const priorityScore = task.priority / 3;
        const score = (priorityScore * 0.6) + (energyMatch * 0.4);

        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      if (bestIdx !== -1 && remainingCapacity >= task.duration) {
        const slot = slots[bestIdx];
        for (let j = bestIdx; j < bestIdx + requiredSlots; j++) slots[j].status = 'scheduled';

        remainingCapacity -= task.duration;
        scheduledTasks.push({
          task,
          slotDateTime: `${slot.date}T${slot.startTime}:00`,
          score: bestScore
        });
      } else {
        unscheduledTasks.push({ task, reason: 'No suitable slot or capacity full' });
      }
    }


    await query(
      `DELETE FROM schedules WHERE user_id = $1 AND scheduled_slot >= $2 AND scheduled_slot < $3 AND locked_flag = false`,
      [user.id, `${weekStart}T00:00:00`, getDateFromWeekStart(weekStart, 7)]
    );

    const scheduleIds = [];
    for (const item of scheduledTasks) {
      const res = await query(
        `INSERT INTO schedules (user_id, task_id, scheduled_slot, locked_flag, score, status)
     VALUES ($1, $2, $3, false, $4, 'scheduled') RETURNING id`,
        [user.id, item.task.id, item.slotDateTime, Math.round(item.score * 100)]
      );
      scheduleIds.push(res.rows[0].id);
      await query('UPDATE tasks SET status = $1 WHERE id = $2', ['scheduled', item.task.id]);
    }


    return Response.json({
      success: true,
      data: {
        weekStart: weekStart,
        capacity: Math.round(totalCapacityMins / 60 * 10) / 10,
        hours_planned: Math.round((totalCapacityMins - remainingCapacity) / 60 * 10) / 10,

        scheduled: scheduledTasks.map((item, index) => ({
          schedule_id: scheduleIds[index],
          taskId: item.task.id,
          taskTitle: item.task.title,
          domain: item.task.domain,
          duration: item.task.duration,
          scheduledSlot: item.slotDateTime,
          score: Math.round(item.score * 100) / 100
        })),
        unscheduled: unscheduledTasks.map(u => ({
          taskId: u.task.id,
          taskTitle: u.task.title,
          reason: u.reason
        }))
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}