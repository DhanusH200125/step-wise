import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

export async function GET(request) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        
        const uid = user.userId ?? user.userid ?? user.id;

        // Extract query parameters for filtering and sorting tasks
        const { searchParams } = new URL(request.url);
        const domain = searchParams.get('domain');
        const priority = searchParams.get('priority');
        const status = searchParams.get('status');
        const energy = searchParams.get('energy');
        const sort = searchParams.get('sort') || 'deadline';
        const order = searchParams.get('order') || 'asc';
        const search = searchParams.get('search');

        // Initialize SQL conditions and parameters for dynamic query building
        let whereConditions = ['user_id = $1'];
        let params = [uid];
        let paramCount = 1;

        if (domain) {
            paramCount++;
            whereConditions.push(`domain = $${paramCount}`);
            params.push(domain);
        }

        if (priority) {
            paramCount++;
            whereConditions.push(`priority = $${paramCount}`);
            params.push(parseInt(priority, 10));
        }

        if (status) {
            paramCount++;
            whereConditions.push(`status = $${paramCount}`);
            params.push(status);
        }

        if (energy) {
            paramCount++;
            whereConditions.push(`energy = $${paramCount}`);
            params.push(energy);
        }

        if (search) {
            paramCount++;
            whereConditions.push(`title ILIKE $${paramCount}`);
            params.push(`%${search}%`);
        }

        // Finalize WHERE clause and validate sort parameters to prevent SQL injection
        const whereClause = whereConditions.join(' AND ');
        const sortField = ['priority', 'deadline', 'created_at', 'domain', 'energy', 'duration'].includes(sort) ? sort : 'deadline';
        const orderDir = order === 'desc' ? 'DESC' : 'ASC';

        // Execute task retrieval query with overdue status check
        const result = await query(
            `SELECT *, 
              (deadline < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')) as is_overdue
            FROM tasks 
            WHERE ${whereClause}
            ORDER BY ${sortField} ${orderDir}`,
            params
        );

        return NextResponse.json({ tasks: result.rows }, { status: 200 });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        
        const uid = user.userId ?? user.userid ?? user.id;
        if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { title, domain, priority, deadline, duration, flexibility, energy } = body;

        // Validate basic task title constraints
        if (!title || !title.trim() || title.length > 200) {
            return NextResponse.json({ error: 'Title is required and must be under 200 characters' }, { status: 400 });
        }

        if (!duration || isNaN(parseInt(duration)) || parseInt(duration) <= 0) {
            return NextResponse.json({ error: 'Duration must be a number greater than 0' }, { status: 400 });
        }

        // Ensure task domain is one of the allowed categories
        const validDomains = ['Work/Study', 'Personal Growth', 'Health', 'Life Admin'];
        const normalizedDomain = domain ? domain.toString().trim() : '';
        if (!validDomains.some(d => d.toLowerCase() === normalizedDomain.toLowerCase())) {
            return NextResponse.json({ error: `Invalid domain: ${domain}` }, { status: 400 });
        }

        if (!priority || ![1, 2, 3].includes(parseInt(priority))) {
            return NextResponse.json({ error: 'Priority must be 1, 2, or 3' }, { status: 400 });
        }

        const normalizedEnergy = energy ? energy.toString().toLowerCase().trim() : 'medium';
        if (!['low', 'medium', 'high'].includes(normalizedEnergy)) {
            return NextResponse.json({ error: 'Energy must be low, medium, or high' }, { status: 400 });
        }

        // Validate task flexibility (hard deadline vs soft target)
        const normalizedFlex = flexibility ? flexibility.toString().toLowerCase().trim() : 'soft';
        if (!['hard', 'soft'].includes(normalizedFlex)) {
            return NextResponse.json({ error: 'Flexibility must be hard or soft' }, { status: 400 });
        }

        let deadlineValue = null;
        if (deadline) {
            const deadlineDate = new Date(deadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (normalizedFlex === 'hard' && deadlineDate < today) {
                return NextResponse.json({ error: 'Hard deadline cannot be in the past' }, { status: 400 });
            }
            deadlineValue = deadline;
        }

        
        // Persist the new task record to the database
        const result = await query(
            `INSERT INTO tasks (user_id, title, domain, priority, deadline, duration, flexibility, energy, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            RETURNING *`,
            [
                uid,
                title.trim(),
                normalizedDomain,
                parseInt(priority, 10),
                deadlineValue,
                parseInt(duration, 10),
                normalizedFlex,
                normalizedEnergy,
                'pending'
            ]
        );

        
        // Log task creation event for activity history and analytics
        await query(
            `INSERT INTO logs (user_id, task_id, action_type, metadata, planned_duration, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())`,
            [uid, result.rows[0].id, 'task_created', JSON.stringify(result.rows[0]), parseInt(duration, 10)]
        );

        return NextResponse.json({ task: result.rows[0], message: 'Task created successfully' }, { status: 201 });
    } catch (error) {
        console.error('Error creating task:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const uid = user.userId ?? user.userid ?? user.id;

        const body = await request.json();
        const { taskids, action } = body;

        if (!Array.isArray(taskids) || !action) {
            return NextResponse.json({ error: 'Missing taskids or action' }, { status: 400 });
        }

        if (!['complete', 'cancel'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        let affectedCount = 0;

        for (const taskId of taskids) {
            // Verify task ownership before applying updates
            const taskResult = await query(
                'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
                [taskId, uid]
            );

            if (taskResult.rows.length === 0) continue;

            const task = taskResult.rows[0];

            // Mark task as completed and record completion metrics
            if (action === 'complete') {
                await query(
                    'UPDATE tasks SET status = $1, completed_at = NOW(), updated_at = NOW() WHERE id = $2',
                    ['completed', taskId]
                );

                await query(
                    `INSERT INTO logs (user_id, task_id, action_type, planned_duration, actual_duration, created_at)
                    VALUES ($1, $2, $3, $4, $5, NOW())`,
                    [uid, taskId, 'task_completed', task.duration, task.duration]
                );
            } 
            // Mark task as cancelled and update logs accordingly
            else if (action === 'cancel') {
                await query(
                    'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2',
                    ['cancelled', taskId]
                );

                await query(
                    `INSERT INTO logs (user_id, task_id, action_type, created_at)
                    VALUES ($1, $2, $3, NOW())`,
                    [uid, taskId, 'task_cancelled']
                );
            }

            affectedCount++;
        }

        return NextResponse.json({
            success: true,
            affected_count: affectedCount,
            message: `${affectedCount} tasks ${action}d`
        });
    } catch (error) {
        console.error('Error in bulk action:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}