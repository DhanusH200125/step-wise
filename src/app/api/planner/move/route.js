import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';


export async function PUT(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    const { schedule_id, new_slot } = await request.json();

    if (!schedule_id || !new_slot) {
      return Response.json(
        { success: false, error: 'Missing schedule_id or new_slot' },
        { status: 400 }
      );
    }

    
    const scheduleRes = await query(
      `SELECT s.*, t.duration FROM schedules s
       JOIN tasks t ON s.task_id = t.id
       WHERE s.id = $1 AND s.user_id = $2`,
      [schedule_id, user.id]
    );

    if (scheduleRes.rows.length === 0) {
      return Response.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      );
    }

    const schedule = scheduleRes.rows[0];
    const slotDate = new Date(new_slot);
    const taskDuration = schedule.duration;

    
    async function isSlotFree(slot, duration) {
      const slotEnd = new Date(slot);
      slotEnd.setMinutes(slotEnd.getMinutes() + duration);

      
      const routineRes = await query(
        `SELECT * FROM routines 
         WHERE user_id = $1 
         AND day_of_week = $2
         AND start_time < $3 AND end_time > $4`,
        [user.id, slotDate.getDay(), slotEnd.toISOString().split('T')[1], slot.split('T')[1]]
      );

      if (routineRes.rows.length > 0) {
        return false;
      }

      
      const scheduleCheckRes = await query(
        `SELECT * FROM schedules 
         WHERE user_id = $1 
         AND id != $2
         AND scheduled_slot < $3
         AND (scheduled_slot + INTERVAL '1 minute' * duration) > $4`,
        [user.id, schedule_id, slotEnd.toISOString(), slot]
      );

      return scheduleCheckRes.rows.length === 0;
    }

    const isFree = await isSlotFree(new_slot, taskDuration);
    if (!isFree) {
      return Response.json(
        { success: false, error: 'This slot is already occupied' },
        { status: 409 }
      );
    }

    
    const updatedRes = await query(
      'UPDATE schedules SET scheduled_slot = $1 WHERE id = $2 RETURNING *',
      [new_slot, schedule_id]
    );

    
    await query(
      `INSERT INTO logs (user_id, action_type, metadata)
       VALUES ($1, $2, $3)`,
      [user.id, 'plan_modified', JSON.stringify({
        action: 'task_moved',
        from: schedule.scheduledSlot,
        to: new_slot
      })]
    );

    return Response.json({
      success: true,
      data: {
        schedule_id: updatedRes.rows[0].id,
        scheduledSlot: updatedRes.rows[0].scheduledSlot
      }
    });
  } catch (error) {
    console.error('Error moving task:', error);
    return Response.json(
      { success: false, error: 'Failed to move task' },
      { status: 500 }
    );
  }
}
