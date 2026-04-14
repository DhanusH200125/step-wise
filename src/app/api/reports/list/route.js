import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    const reportRes = await query(
      `SELECT week_start_date, metrics
       FROM reports
       WHERE user_id = $1
       ORDER BY week_start_date DESC`,
      [user.id]
    );

    const reports = reportRes.rows.map(r => ({
      weekStart: r.weekStartDate,
      completionRate: r.metrics?.completionRate || 0,
      createdAt: r.createdAt
    }));

    return Response.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching reports list:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
