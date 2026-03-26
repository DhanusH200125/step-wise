import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

// Default user settings fallback used when a profile is newly created
const DEFAULT_PREFERENCES = {
  timezone: 'UTC',
  workingdays: [1, 2, 3, 4, 5],
  planningstartday: 1,
  defaulttaskduration: 30,
  energyprofile: { morning: 'medium', afternoon: 'medium', evening: 'medium' },
  notificationreminders: true,
  reminderleadtime: 15,
  planningreminder: true,
  retrospectivereminder: true,
  quiethoursstart: '2300',
  quiethoursend: '0600',
  onboarding_completed: false,
};


export async function GET(request) {
  try {
    const decoded = await getUserFromRequest(request);
    if (!decoded) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    
    const uid = decoded.userId ?? decoded.userid ?? decoded.id;
    if (!uid) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch user preferences and related metadata from the database
    const result = await query(
      'SELECT preferences, growth_target_hours, role, email, name FROM users WHERE id = $1',
      [uid]
    );
    if (result.rows.length === 0) return Response.json({ error: 'User not found' }, { status: 404 });

    const user = result.rows[0];
    // Merge database preferences with defaults to ensure all fields are present
    const merged = {
      ...DEFAULT_PREFERENCES,
      ...(user.preferences && typeof user.preferences === 'object' ? user.preferences : {}),
    };

    return Response.json({
      preferences: merged,
      growth_target_hours: user.growth_target_hours,
      role: user.role,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error('[Preferences GET]', error);
    return Response.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}


export async function PUT(request) {
  try {
    const decoded = await getUserFromRequest(request);
    if (!decoded) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    
    const uid = decoded.userId ?? decoded.userid ?? decoded.id;
    if (!uid) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      timezone, workingdays, planningstartday, defaulttaskduration,
      energyprofile, notificationreminders, reminderleadtime,
      planningreminder, retrospectivereminder, quiethoursstart,
      quiethoursend, growth_target_hours,
    } = body;

    const parsedGrowth = growth_target_hours !== undefined ? Number(growth_target_hours) : undefined;

    // Validate growth target hours range (0-40)
    if (parsedGrowth !== undefined && (isNaN(parsedGrowth) || parsedGrowth < 0 || parsedGrowth > 40))
      return Response.json({ error: 'growth_target_hours must be 0-40' }, { status: 400 });

    // Validate working days (must be an array of integers between 0 and 6)
    if (workingdays !== undefined &&
      (!Array.isArray(workingdays) || workingdays.length === 0 ||
        !workingdays.every(d => typeof d === 'number' && d >= 0 && d <= 6)))
      return Response.json({ error: 'workingdays must be an array of integers 0-6' }, { status: 400 });

    // Validate notification lead time constraints
    if (reminderleadtime !== undefined && ![5, 15, 30, 60].includes(reminderleadtime))
      return Response.json({ error: 'reminderleadtime must be 5, 15, 30, or 60' }, { status: 400 });

    const existing = await query('SELECT preferences FROM users WHERE id = $1', [uid]);
    const existingPrefs = existing.rows[0]?.preferences || {};

    // Partially update preferences by merging incoming changes with existing ones
    const updated = {
      ...existingPrefs,
      ...(timezone !== undefined && { timezone }),
      ...(workingdays !== undefined && { workingdays }),
      ...(planningstartday !== undefined && { planningstartday }),
      ...(defaulttaskduration !== undefined && { defaulttaskduration }),
      ...(energyprofile !== undefined && {
        energyprofile: { ...existingPrefs.energyprofile, ...energyprofile },
      }),
      ...(notificationreminders !== undefined && { notificationreminders }),
      ...(reminderleadtime !== undefined && { reminderleadtime }),
      ...(planningreminder !== undefined && { planningreminder }),
      ...(retrospectivereminder !== undefined && { retrospectivereminder }),
      ...(quiethoursstart !== undefined && { quiethoursstart }),
      ...(quiethoursend !== undefined && { quiethoursend }),
    };

    // Persist updated preferences and metadata to the users table
    const updateResult = await query(
      `UPDATE users
          SET preferences         = $1,
               growth_target_hours = COALESCE($2, growth_target_hours),
               timezone            = COALESCE($4, timezone)
         WHERE id = $3
         RETURNING preferences, growth_target_hours, role, email, name`,
      [JSON.stringify(updated), parsedGrowth ?? null, uid, timezone ?? null]
    );

    // Log preference update event for auditing
    try {
      await query(
        `INSERT INTO logs (user_id, action_type, metadata, created_at) VALUES ($1, $2, $3, NOW())`,
        [uid, 'preferences_updated', JSON.stringify({ newPreferences: updated })]
      );
    } catch (logErr) {
      console.warn('[Preferences PUT] audit log skipped:', logErr.message);
    }

    const saved = updateResult.rows[0];
    return Response.json({
      success: true,
      preferences: updated,
      growth_target_hours: saved.growth_target_hours,
      role: saved.role,
      email: saved.email,
      name: saved.name,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('[Preferences PUT]', error);
    return Response.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}

export const PATCH = PUT;