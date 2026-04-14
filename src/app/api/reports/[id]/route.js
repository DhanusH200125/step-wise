import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';



export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const result = await query(
      `SELECT id,
              COALESCE(week_start_date, weekstart) AS week_start_date,
              metrics,
              domain_breakdown,
              insights,
              COALESCE(growth_data, growth_data) AS growth_data,
              suggestions,
              created_at, updated_at
       FROM reports
       WHERE id = $1 AND user_id = $2`,
      [id, user.userId]
    );

    if (result.rows.length === 0)
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    const r = result.rows[0];
    return NextResponse.json({
      success: true,
      data: {
        id:              r.id,
        weekStartDate:   r.weekStartDate,
        metrics:         r.metrics         || {},
        domainBreakdown: r.domainBreakdown || [],
        insights:        r.insights        || [],
        growthData:      r.growthData     || {},
        suggestions:     r.suggestions     || [],
        createdAt:       r.createdAt,
        updatedAt:       r.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Reports GET /id]', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}



export async function DELETE(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const result = await query(
      'DELETE FROM reports WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, user.userId]
    );

    if (result.rowCount === 0)
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    console.error('[Reports DELETE /id]', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
