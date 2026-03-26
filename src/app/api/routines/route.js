import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

// Ensure the week_date column exists for one-off weekly events
async function ensureWeekDateColumn() {
  try {
    await query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'routines' AND column_name = 'week_date'
        ) THEN
          ALTER TABLE routines ADD COLUMN week_date DATE DEFAULT NULL;
        END IF;
      END $$;
    `);
  } catch (_) {}
}

const categoryColors = {
  sleep: '#1E3A5F', work: '#DC2626', class: '#F59E0B',
  personal: '#10B981', other: '#6B7280',
};

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const uid = user.userId ?? user.userid ?? user.id;
    await ensureWeekDateColumn();

    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('week_start'); // YYYY-MM-DD (Monday)

    let result;
    if (weekStart) {
      const [wy, wm, wd] = weekStart.split('-').map(Number);
      const mondayDate = new Date(wy, wm - 1, wd);
      const weekEnd = new Date(mondayDate);
      weekEnd.setDate(mondayDate.getDate() + 6); // Sunday = Monday + 6
      const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth()+1).padStart(2,'0')}-${String(weekEnd.getDate()).padStart(2,'0')}`;

      // Get recurring routines (week_date IS NULL) + one-off for this specific week
      result = await query(
        `SELECT
          id,
          user_id,
          title AS label,
          type AS category,
          day_of_week,
          start_time,
          end_time,
          color,
          week_date,
          created_at,
          updated_at
        FROM routines
        WHERE user_id = $1
          AND (
            week_date IS NULL
            OR (week_date >= $2::date AND week_date <= $3::date)
          )
        ORDER BY day_of_week ASC, start_time ASC`,
        [uid, weekStart, weekEndStr]
      );
    } else {
      // Fetch all recurring routines (original behaviour)
      result = await query(
        `SELECT
          id,
          user_id,
          title AS label,
          type AS category,
          day_of_week,
          start_time,
          end_time,
          color,
          week_date,
          created_at,
          updated_at
        FROM routines
        WHERE user_id = $1 AND week_date IS NULL
        ORDER BY day_of_week ASC, start_time ASC`,
        [uid]
      );
    }

    return NextResponse.json({ routines: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching routines:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const uid = user.userId ?? user.userid ?? user.id;
    await ensureWeekDateColumn();

    const body = await req.json();
    const { label, day_of_week, start_time, end_time, category = 'other', repeat_weekly = true, week_date = null } = body;

    const parsedDay = typeof day_of_week === 'number' ? day_of_week : parseInt(day_of_week, 10);
    const normalizedStart = start_time?.slice(0, 5);
    const normalizedEnd = end_time?.slice(0, 5);

    if (!label || isNaN(parsedDay) || !normalizedStart || !normalizedEnd) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const color = categoryColors[category] || categoryColors.other;
    // If repeat_weekly is false, store with a specific week_date so it only shows for that week
    const storedWeekDate = repeat_weekly ? null : week_date;

    const result = await query(
      `INSERT INTO routines (user_id, title, type, day_of_week, start_time, end_time, color, week_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING id, user_id, title AS label, type AS category, day_of_week, start_time, end_time, color, week_date`,
      [uid, label.trim(), category, parsedDay, normalizedStart, normalizedEnd, color, storedWeekDate]
    );

    return NextResponse.json({ routine: result.rows[0], message: 'Routine created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error creating routine:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}