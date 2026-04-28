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

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    const now = new Date();

    
    const missedRes = await query(
      `SELECT s.id, s.task_id, s.scheduled_slot, t.title, t.duration, t.energy
       FROM schedules s
       JOIN tasks t ON s.task_id = t.id
       WHERE s.user_id = $1 
       AND s.scheduled_slot < $2
       AND s.status = 'scheduled'
       ORDER BY s.scheduled_slot DESC`,
      [user.id, now.toISOString()]
    );

    const missedTasks = missedRes.rows;

    
    const missedWithSuggestions = await Promise.all(missedTasks.map(async (missed) => {
      
      let suggestedSlot = null;
      let canReschedule = false;

      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);

      
      for (let daysAhead = 0; daysAhead < 7 && !suggestedSlot; daysAhead++) {
        const checkDate = new Date(missed.scheduledSlot);
        checkDate.setDate(checkDate.getDate() + daysAhead + 1);

        if (checkDate > weekEnd) break;

        for (let timeSlot = 7 * 60; timeSlot < 23 * 60 && !suggestedSlot; timeSlot += 30) {
          const slotStart = new Date(checkDate);
          slotStart.setHours(Math.floor(timeSlot / 60), timeSlot % 60, 0);

          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + missed.duration);

          
          const conflictRes = await query(
            `SELECT COUNT(*) as count FROM schedules 
             WHERE user_id = $1 
             AND scheduled_slot < $2
             AND (scheduled_slot + INTERVAL '1 minute' * (SELECT duration FROM tasks WHERE id = task_id)) > $3`,
            [user.id, slotEnd.toISOString().split('.')[0], slotStart.toISOString().split('.')[0]]
          );

          if (conflictRes.rows[0].count === 0) {
            suggestedSlot = slotStart.toISOString();
            canReschedule = true;
            break;
          }
        }
      }

      return {
        schedule_id: missed.id,
        taskId: missed.taskId,
        taskTitle: missed.title,
        original_slot: missed.scheduledSlot,
        suggested_slot: suggestedSlot,
        can_reschedule: canReschedule,
        reason: !canReschedule ? 'No available slots this week' : null,
        capacity_after_reschedule: 0.85 
      };
    }));

    return Response.json({
      success: true,
      data: missedWithSuggestions
    });
  } catch (error) {
    console.error('Error checking missed tasks:', error);
    return Response.json(
      { success: false, error: 'Failed to check missed tasks' },
      { status: 500 }
    );
  }
}
