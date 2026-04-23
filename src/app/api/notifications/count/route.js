

import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const countRes = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [user.userId || user.id]
    );
    return Response.json({
      success: true,
      unread_count: parseInt(countRes.rows[0]?.count || 0),
    });
  } catch (error) {
    console.error('[Notifications Count]', error);
    return Response.json({ success: false, error: 'Failed to get count' }, { status: 500 });
  }
}