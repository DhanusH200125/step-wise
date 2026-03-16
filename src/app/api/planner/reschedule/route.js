import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    const { schedule_id, action, new_slot } = await request.json();

    if (!schedule_id || !action) {
      return Response.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    
    const scheduleRes = await query(
      'SELECT * FROM schedules WHERE id = $1 AND user_id = $2',
      [schedule_id, user.id]
    );

    if (scheduleRes.rows.length === 0) {
      return Response.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      );
    }

    const schedule = scheduleRes.rows[0];

    if (action === 'reschedule') {
      if (!new_slot) {
        return Response.json(
          { success: false, error: 'new_slot required for reschedule' },
          { status: 400 }
        );
      }

      
      await query(
        'UPDATE schedules SET scheduled_slot = $1, status = $2 WHERE id = $3',
        [new_slot, 'rescheduled', schedule_id]
      );

      
      await query(
        `UPDATE tasks SET reschedule_count = reschedule_count + 1, status = $1 
         WHERE id = $2`,
        ['scheduled', schedule.taskId]
      );

      
      await query(
        `INSERT INTO logs (user_id, task_id, action_type, metadata)
         VALUES ($1, $2, $3, $4)`,
        [user.id, schedule.taskId, 'task_rescheduled', JSON.stringify({
          from: schedule.scheduledSlot,
          to: new_slot
        })]
      );

      return Response.json({
        success: true,
        message: 'Task rescheduled successfully',
        data: { schedule_id, new_slot }
      });

    } else if (action === 'backlog') {
      
      await query('DELETE FROM schedules WHERE id = $1', [schedule_id]);

      
      await query(
        'UPDATE tasks SET status = $1 WHERE id = $2',
        ['pending', schedule.taskId]
      );

      
      await query(
        `INSERT INTO logs (user_id, task_id, action_type, metadata)
         VALUES ($1, $2, $3, $4)`,
        [user.id, schedule.taskId, 'task_rescheduled', JSON.stringify({
          action: 'moved_to_backlog'
        })]
      );

      return Response.json({
        success: true,
        message: 'Task moved to backlog',
        data: { schedule_id }
      });

    } else if (action === 'cancel') {
      
      await query('DELETE FROM schedules WHERE id = $1', [schedule_id]);

      
      await query(
        'UPDATE tasks SET status = $1 WHERE id = $2',
        ['cancelled', schedule.taskId]
      );

      
      await query(
        `INSERT INTO logs (user_id, task_id, action_type, metadata)
         VALUES ($1, $2, $3, $4)`,
        [user.id, schedule.taskId, 'task_cancelled', JSON.stringify({})]
      );

      return Response.json({
        success: true,
        message: 'Task cancelled',
        data: { schedule_id }
      });

    } else {
      return Response.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error rescheduling task:', error);
    return Response.json(
      { success: false, error: 'Failed to reschedule task' },
      { status: 500 }
    );
  }
}
