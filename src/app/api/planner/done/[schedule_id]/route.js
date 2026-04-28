import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

export async function PUT(request, { params }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    const { schedule_id } = await params;
    const uid = user.userId ?? user.userid ?? user.id;

    // Fetch the schedule to get task_id
    const scheduleRes = await query(
      'SELECT id, task_id, status, user_id FROM schedules WHERE id = $1 AND user_id = $2',
      [schedule_id, uid]
    );

    if (scheduleRes.rows.length === 0) {
      return Response.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      );
    }

    const schedule = scheduleRes.rows[0];
    // Use both camelCase and snake_case fallback for taskId since db transforms it
    const taskId = schedule.taskId ?? schedule.task_id;
    const isCurrentlyCompleted = schedule.status === 'completed';

    // Toggle: completed → scheduled, anything else → completed
    const newScheduleStatus = isCurrentlyCompleted ? 'scheduled' : 'completed';
    const newTaskStatus = isCurrentlyCompleted ? 'pending' : 'completed';

    console.log(`[done] schedule_id=${schedule_id} taskId=${taskId} uid=${uid} isCompleted=${isCurrentlyCompleted} → ${newScheduleStatus}`);

    // Update the schedule status
    const scheduleUpdate = await query(
      'UPDATE schedules SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING id, status',
      [newScheduleStatus, schedule_id, uid]
    );

    if (scheduleUpdate.rows.length === 0) {
      return Response.json({ success: false, error: 'Failed to update schedule' }, { status: 500 });
    }

    // Update the parent task status and completed_at timestamp
    if (taskId) {
      await query(
        `UPDATE tasks SET status = $1, completed_at = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4`,
        [
          newTaskStatus,
          newTaskStatus === 'completed' ? new Date() : null,
          taskId,
          uid
        ]
      );
    }

    return Response.json({
      success: true,
      data: {
        schedule_id,
        status: newScheduleStatus
      }
    });
  } catch (error) {
    console.error('Error toggling done status:', error);
    return Response.json(
      { success: false, error: 'Failed to toggle status' },
      { status: 500 }
    );
  }
}
