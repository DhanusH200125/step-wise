import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

export async function PUT(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const uid = user.userId ?? user.id;
    const body = await req.json();

    const { label, day_of_week, start_time, end_time, category = 'other' } = body;

    
    const parsedDay = parseInt(String(day_of_week), 10);
    const normalizedStart = start_time?.slice(0, 5);
    const normalizedEnd = end_time?.slice(0, 5);

    if (!label || isNaN(parsedDay) || !normalizedStart || !normalizedEnd) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    
    const result = await query(
      `UPDATE routines
       SET title = $1, type = $2, day_of_week = $3, start_time = $4, end_time = $5, updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING id, user_id, title AS label, type AS category, day_of_week, start_time, end_time, color`,
      [label.trim(), category, parsedDay, normalizedStart, normalizedEnd, id, uid]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    return NextResponse.json({ routine: result.rows[0] }, { status: 200 });

  } catch (error) {
    console.error('Error updating routine:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const uid = user.userId ?? user.id;

    await query(
      `DELETE FROM routines WHERE id = $1 AND user_id = $2`,
      [id, uid]
    );

    return NextResponse.json({ message: 'Routine deleted' }, { status: 200 });

  } catch (error) {
    console.error('Error deleting routine:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}