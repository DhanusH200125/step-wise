import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

// Handler for retrieving paginated user activity logs with optional filtering
export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    const uid = user.userid ?? user.id;

    const { searchParams } = new URL(request.url);
    const actiontype = searchParams.get('actiontype');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
    const offset = (page - 1) * limit;


    // Dynamically build the SQL WHERE clause based on provided filters
    let whereClause = 'l.user_id = $1';
    let params = [uid];
    let paramCount = 2;

    if (actiontype) {
      whereClause += ` AND l.action_type = $${paramCount}`;
      params.push(actiontype);
      paramCount++;
    }

    if (from) {
      whereClause += ` AND l.created_at >= $${paramCount}`;
      params.push(new Date(from));
      paramCount++;
    }

    if (to) {
      whereClause += ` AND l.created_at <= $${paramCount}`;
      params.push(new Date(to));
      paramCount++;
    }


    const countResult = await query(
      `SELECT COUNT(*) as count FROM logs l WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);


    // Fetch logs with associated task titles, ordered by most recent first
    const logsResult = await query(
      `SELECT
        l.id,
        l.action_type,
        l.task_id,
        l.metadata,
        l.planned_duration,
        l.actual_duration,
        l.created_at,
        t.title AS task_title
      FROM logs l
      LEFT JOIN tasks t ON l.task_id = t.id
      WHERE ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );


    // Map raw log data to human-readable activity descriptions
    const logs = logsResult.rows.map(log => {
      let description = '';

      switch (log.action_type) {
        case 'task_created': description = `Created task: ${log.task_title}`; break;
        case 'task_updated': description = `Updated task: ${log.task_title}`; break;
        case 'task_completed': description = `Completed task: ${log.task_title} (${log.actual_duration || log.planned_duration} min)`; break;
        case 'task_cancelled': description = `Cancelled task: ${log.task_title}`; break;
        case 'task_started': description = `Started task: ${log.task_title}`; break;
        case 'task_rescheduled': description = `Rescheduled task: ${log.task_title}`; break;
        case 'routine_created': description = `Created routine: ${log.metadata?.label || 'Unknown'}`; break;
        case 'routine_updated': description = `Updated routine: ${log.metadata?.label || 'Unknown'}`; break;
        case 'routine_deleted': description = `Deleted routine: ${log.metadata?.label || 'Unknown'}`; break;
        case 'plan_generated': description = `Generated weekly plan (${log.metadata?.tasksscheduled || 0} tasks)`; break;
        case 'plan_modified': description = `Modified plan`; break;
        case 'preferences_updated': description = `Updated preferences`; break;
        case 'user_registered': description = `Account created`; break;
        case 'user_login': description = `Logged in`; break;
        default: description = (log.actionType || log.action_type || 'Unknown action');
      }

      return {
        id: log.id,
        actiontype: log.actionType || '',
        taskId: log.taskId,
        tasktitle: log.taskTitle || '',
        description,
        metadata: log.metadata,
        plannedduration: log.plannedDuration,
        actualduration: log.actualDuration,
        createdat: log.createdAt,
      };
    });

    return Response.json({
      success: true,
      data: logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });

  } catch (error) {
    console.error('Error fetching logs:', error);
    return Response.json({ success: false, error: 'Failed to fetch logs' }, { status: 500 });
  }
}