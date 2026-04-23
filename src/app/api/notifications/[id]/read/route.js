import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

export async function PUT(request, { params }) {
  try {
    const user = await getUserFromRequest(request); 
    if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const uid = user.userid ?? user.id; 

    const notifRes = await query(
      'SELECT * FROM notifications WHERE id = $1 AND user_id = $2',
      [id, uid]
    );

    if (notifRes.rows.length === 0) {
      return Response.json({ success: false, error: 'Notification not found' }, { status: 404 });
    }

    await query('UPDATE notifications SET is_read = true WHERE id = $1', [id]);

    return Response.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('[Notifications mark read]', error);
    return Response.json({ success: false, error: 'Failed to mark as read' }, { status: 500 });
  }
}