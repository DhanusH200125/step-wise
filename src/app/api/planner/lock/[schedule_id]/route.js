import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';


export async function PUT(request, { params }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

   const { schedule_id } = await params;

    
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
    const newLockStatus = !schedule.lockedFlag;

    
    const updatedRes = await query(
      'UPDATE schedules SET locked_flag = $1 WHERE id = $2 RETURNING *',
      [newLockStatus, schedule_id]
    );

    return Response.json({
      success: true,
      data: {
        scheduleId: updatedRes.rows[0].id,
        locked: updatedRes.rows[0].lockedFlag
      }
    });
  } catch (error) {
    console.error('Error toggling lock:', error);
    return Response.json(
      { success: false, error: 'Failed to toggle lock' },
      { status: 500 }
    );
  }
}
