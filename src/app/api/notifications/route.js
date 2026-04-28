import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';




// Handler for fetching user notifications with unread filtering support
export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
    
    
    const uid = user.userId ?? user.id;

    
    let whereClause = `user_id = $1`;
    const params = [uid];

    if (unreadOnly) {
      whereClause += ` AND is_read = false`;
    }

    // Fetch notifications ordered by creation date, optionally filtering for unread items
    const notifRes = await query(
      `SELECT * FROM notifications WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1}`,
      [...params, limit]
    );

    // Independently count total unread notifications for badge indicators
    const unreadCountRes = await query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [uid]
    );

    return Response.json({
      success: true,
      data: notifRes.rows,
      unreadcount: parseInt(unreadCountRes.rows[0]?.count) || 0,
    });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return Response.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
  }
}




// Handler for clearing all notifications that have been marked as read
export async function DELETE(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const uid = user.userId ?? user.id;

    await query(
      `DELETE FROM notifications WHERE user_id = $1 AND is_read = true`,
      [uid]
    );

    return Response.json({ 
      success: true, 
      message: 'Read notifications cleared' 
    });
  } catch (error) {
    console.error('Notifications DELETE error:', error);
    return Response.json({ success: false, error: 'Failed to clear notifications' }, { status: 500 });
  }
}