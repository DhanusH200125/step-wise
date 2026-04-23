import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const uid = user.userId ?? user.userid ?? user.id;

    
    const prefsRes = await query(`SELECT preferences FROM users WHERE id = $1`, [uid]);
    const prefs = prefsRes.rows[0]?.preferences ?? {};
    const leadTimeHours = prefs.reminderleadtime === 60 ? 24 : 48;

    const now = new Date();
    const windowEnd = new Date(now.getTime() + leadTimeHours * 60 * 60 * 1000);

    
    const tasksRes = await query(
      `SELECT id, title, deadline, priority
       FROM tasks
       WHERE user_id = $1
         AND deadline IS NOT NULL
         AND deadline > $2
         AND deadline <= $3
         AND LOWER(status) NOT IN ('completed', 'cancelled')`,
      [uid, now.toISOString(), windowEnd.toISOString()]
    );

    let created = 0;

    for (const task of tasksRes.rows) {
      const hoursUntil = Math.round((new Date(task.deadline) - now) / (1000 * 60 * 60));
      const label =
        hoursUntil <= 1  ? 'due in less than 1 hour' :
        hoursUntil <= 24 ? `due in ${hoursUntil}h` :
                           `due in ${Math.round(hoursUntil / 24)}d`;

      
      const dupCheck = await query(
        `SELECT id FROM notifications
         WHERE user_id = $1
           AND related_task_id = $2
           AND type = 'deadline_reminder'
           AND created_at > NOW() - INTERVAL '6 hours'`,
        [uid, task.id]
      );
      if (dupCheck.rows.length > 0) continue;

      await query(
        `INSERT INTO notifications (user_id, type, message, is_read, related_task_id, created_at)
         VALUES ($1, $2, $3, false, $4, NOW())`,
        [uid, 'deadline_reminder', `"${task.title}" is ${label}`, task.id]
      );
      created++;
    }

    
    const overdueRes = await query(
      `SELECT id, title, deadline
       FROM tasks
       WHERE user_id = $1
         AND deadline IS NOT NULL
         AND deadline < $2
         AND LOWER(status) NOT IN ('completed', 'cancelled')`,
      [uid, now.toISOString()]
    );

    for (const task of overdueRes.rows) {
      const dupCheck = await query(
        `SELECT id FROM notifications
         WHERE user_id = $1
           AND related_task_id = $2
           AND type = 'overdue'
           AND created_at > NOW() - INTERVAL '12 hours'`,
        [uid, task.id]
      );
      if (dupCheck.rows.length > 0) continue;

      await query(
        `INSERT INTO notifications (user_id, type, message, is_read, related_task_id, created_at)
         VALUES ($1, $2, $3, false, $4, NOW())`,
        [uid, 'overdue', `"${task.title}" is overdue — deadline has passed`, task.id]
      );
      created++;
    }

    return Response.json({ success: true, created });
  } catch (error) {
    console.error('Notification check error:', error);
    return Response.json({ success: false, error: 'Failed to check notifications' }, { status: 500 });
  }
}