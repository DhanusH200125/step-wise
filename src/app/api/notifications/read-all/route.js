

import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

export async function PUT(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [user.userId || user.id]
    );
    return Response.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('[Notifications mark all]', error);
    return Response.json({ success: false, error: 'Failed to mark all as read' }, { status: 500 });
  }
}