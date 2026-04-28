import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

export async function PUT(request, { params }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const uid = user.userid ?? user.id ?? user.userId;

    const body = await request.json();
    const { title, domain, priority, deadline, duration, flexibility, energy, status } = body;


    const taskResult = await query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, uid]
    );

    if (taskResult.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found or unauthorized' }, { status: 404 });
    }

    const oldTask = taskResult.rows[0];



    if (title !== undefined && (!title.trim() || title.length > 200)) {
      return NextResponse.json({ error: 'Title is required and must be under 200 characters' }, { status: 400 });
    }


    const finalDuration = duration !== undefined ? parseInt(duration, 10) : oldTask.duration;
    if (duration !== undefined && (isNaN(finalDuration) || finalDuration <= 0)) {
      return NextResponse.json({ error: 'Duration must be a number greater than 0' }, { status: 400 });
    }

    const validDomains = ['Work/Study', 'Personal Growth', 'Health', 'Life Admin'];
    const normalizedDomain = domain ? String(domain).trim() : null;
    if (normalizedDomain && !validDomains.some(d => d.toLowerCase() === normalizedDomain.toLowerCase())) {
      return NextResponse.json({ error: `Invalid domain: ${domain}` }, { status: 400 });
    }


    const priorityMap = { low: 1, medium: 2, high: 3 };
    let finalPriority = oldTask.priority;
    if (priority !== undefined) {
      finalPriority = priorityMap[String(priority).toLowerCase()] || parseInt(priority, 10);
      if (![1, 2, 3].includes(finalPriority)) {
        return NextResponse.json({ error: 'Priority must be 1, 2, or 3' }, { status: 400 });
      }
    }


    const normalizedFlex = flexibility != null
      ? String(flexibility).toLowerCase().trim()
      : oldTask.flexibility;

    if (flexibility != null && !['hard', 'soft'].includes(normalizedFlex)) {
      return NextResponse.json({ error: 'Flexibility must be hard or soft' }, { status: 400 });
    }


    const normalizedEnergy = energy != null
      ? String(energy).toLowerCase().trim()
      : oldTask.energy;

    if (energy != null && !['low', 'medium', 'high'].includes(normalizedEnergy)) {
      return NextResponse.json({ error: 'Energy must be low, medium, or high' }, { status: 400 });
    }


    const normalizedStatus = status ? String(status).toLowerCase().trim() : oldTask.status;
    const validStatuses = ['pending', 'in_progress', 'scheduled', 'completed', 'rescheduled', 'cancelled'];
    if (status && !validStatuses.includes(normalizedStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }


    const updateFields = {
      title: title !== undefined ? title.trim() : oldTask.title,
      domain: domain !== undefined ? domain : oldTask.domain,
      priority: finalPriority,
      deadline: (deadline && String(deadline).trim() !== '') ? deadline : (deadline === undefined ? oldTask.deadline : null),
      duration: finalDuration,
      flexibility: normalizedFlex,
      energy: normalizedEnergy,
      status: normalizedStatus,
    };

    const isCompleting = normalizedStatus === 'completed' && oldTask.status !== 'completed';
    const isStarting = normalizedStatus === 'in_progress' && (oldTask.status !== 'in_progress' || !oldTask.startedAt);
    const isSkipping = body.skipped === true;

    const result = await query(
      `UPDATE tasks
      SET title = $1, domain = $2, priority = $3, deadline = $4,
       duration = $5, flexibility = $6, energy = $7, status = $8,
       completed_at = CASE WHEN $9 THEN NOW() ELSE completed_at END,
       started_at = CASE WHEN $10 THEN NOW() WHEN $9 THEN NULL ELSE started_at END,
       skipped_at = CASE WHEN $11 THEN NOW() ELSE skipped_at END,
       updated_at = NOW()
   WHERE id = $12 AND user_id = $13
   RETURNING *`,
      [
        updateFields.title, updateFields.domain, updateFields.priority,
        updateFields.deadline, updateFields.duration, updateFields.flexibility,
        updateFields.energy, updateFields.status,
        isCompleting,
        isStarting,
        isSkipping,
        id, uid
      ]
    );


    try {
      await query(
        `INSERT INTO logs (user_id, task_id, action_type, metadata, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [uid, id, 'task_updated', JSON.stringify({ old: oldTask, new: result.rows[0] })]
      );
    } catch (logErr) {
      console.warn('task_updated log skipped:', logErr.message);
    }

    return NextResponse.json({ task: result.rows[0], message: 'Task updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const uid = user.userid ?? user.id ?? user.userId;

    const taskRes = await query(
      'SELECT title, duration, domain FROM tasks WHERE id = $1 AND user_id = $2',
      [id, uid]
    );
    if (taskRes.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found or unauthorized' }, { status: 404 });
    }

    const task = taskRes.rows[0];

    await query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [id, uid]);

    try {
      await query(
        `INSERT INTO logs (user_id, action_type, metadata, created_at)
         VALUES ($1, 'task_deleted', $2, NOW())`,
        [uid, JSON.stringify({ taskId: Number(id), title: task.title, domain: task.domain })]
      );
    } catch (logErr) {
      console.warn('task_deleted log skipped:', logErr.message);
    }

    return NextResponse.json({ message: 'Task deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}