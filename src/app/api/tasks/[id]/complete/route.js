import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

export async function PUT(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { actual_duration } = body;

    
    const taskResult = await query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, user.userId]
    );

    if (taskResult.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found or unauthorized' }, { status: 404 });
    }

    const task = taskResult.rows[0];
    const durationToLog = actual_duration || task.duration;

    
    const result = await query(
      'UPDATE tasks SET status = $1, completed_at = NOW(), actual_duration = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      ['completed', actual_duration || task.duration, id]
    );

    
    await query(
      'UPDATE schedules SET status = $1 WHERE task_id = $2 AND user_id = $3',
      ['completed', id, user.userId]
    );

    
    await query(
      `INSERT INTO logs (user_id, task_id, action_type, planned_duration, actual_duration, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())`,
      [user.userId, id, 'task_completed', task.duration, durationToLog]
    );

    return NextResponse.json({
      task: result.rows[0],
      message: 'Task completed successfully'
    });
  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
