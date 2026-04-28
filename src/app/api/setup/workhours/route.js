import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const uid = user.userId ?? user.id;
    const { startTime, endTime, days } = await request.json();

    // Ensure all mandatory scheduling fields are present
    if (!startTime || !endTime || !days?.length) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Remove any previously configured work routines to prevent duplicates
    await query(
      `DELETE FROM routines WHERE user_id = $1 AND type = 'work' AND title = 'Work Hours'`,
      [uid]
    );

    // Create new routine entries for each selected working day
    for (const day of days) {
      await query(
        `INSERT INTO routines (user_id, title, type, day_of_week, start_time, end_time, color, created_at, updated_at)
         VALUES ($1, 'Work Hours', 'work', $2, $3, $4, '#3b82f6', NOW(), NOW())`,
        [uid, day, startTime, endTime]
      );
    }

    // Mark the initial work hours setup as completed in the user's profile
    await query(
      `UPDATE users SET preferences = preferences || '{"workhourssetup": true}'::jsonb WHERE id = $1`,
      [uid]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Work hours setup error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}