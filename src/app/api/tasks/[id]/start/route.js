import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

export async function PUT(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    
    const taskResult = await query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, user.userId]
    );

    if (taskResult.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found or unauthorized' }, { status: 404 });
    }

    
    const result = await query(
      'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['in_progress', id]
    );

    
    await query(
      `INSERT INTO logs (user_id, task_id, action_type, created_at)
      VALUES ($1, $2, $3, NOW())`,
      [user.userId, id, 'task_started']
    );

    return NextResponse.json({
      task: result.rows[0],
      message: 'Task started'
    });
  } catch (error) {
    console.error('Error starting task:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
