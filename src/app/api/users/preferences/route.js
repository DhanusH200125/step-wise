import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';

const defaultPreferences = {
  timezone: 'UTC',
  working_days: [1, 2, 3, 4, 5],
  planning_start_day: 1,
  default_task_duration: 30,
  energy_profile: {
    morning: 'medium',
    afternoon: 'medium',
    evening: 'medium',
  },
  notification_reminders: true,
  reminder_lead_time: 15,
  planning_reminder: true,
  retrospective_reminder: true,
  quiet_hours_start: '23:00',
  quiet_hours_end: '06:00',
  onboarding_completed: false,
};

export async function GET(request) {
  try {
    const decoded = getUserFromRequest(request);

    if (!decoded || !decoded.userId) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await query(
      'SELECT preferences, growth_target_hours, role, email, name FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = result.rows[0];
    const mergedPreferences = {
      ...defaultPreferences,
      ...(user.preferences && typeof user.preferences === 'object' ? user.preferences : {}),
    };

    return Response.json({
      preferences: mergedPreferences,
      growth_target_hours: user.growthTargetHours,
      role: user.role,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return Response.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const decoded = getUserFromRequest(request);

    if (!decoded || !decoded.userId) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      timezone,
      working_days,
      planning_start_day,
      default_task_duration,
      energy_profile,
      notification_reminders,
      reminder_lead_time,
      planning_reminder,
      retrospective_reminder,
      quiet_hours_start,
      quiet_hours_end,
      growth_target_hours,
    } = body;

    
    if (growth_target_hours !== undefined) {
      if (typeof growth_target_hours !== 'number' || growth_target_hours < 0 || growth_target_hours > 40) {
        return Response.json(
          { error: 'growth_target_hours must be a number between 0 and 40' },
          { status: 400 }
        );
      }
    }

    if (working_days !== undefined) {
      if (!Array.isArray(working_days) || working_days.length === 0 || !working_days.every(d => typeof d === 'number' && d >= 0 && d <= 6)) {
        return Response.json(
          { error: 'working_days must be an array of integers 0-6 with at least 1 day' },
          { status: 400 }
        );
      }
    }

    if (timezone !== undefined && typeof timezone !== 'string') {
      return Response.json(
        { error: 'timezone must be a string' },
        { status: 400 }
      );
    }

    if (reminder_lead_time !== undefined && ![5, 15, 30, 60].includes(reminder_lead_time)) {
      return Response.json(
        { error: 'reminder_lead_time must be one of: 5, 15, 30, 60' },
        { status: 400 }
      );
    }

    
    const userResult = await query(
      'SELECT preferences FROM users WHERE id = $1',
      [decoded.userId]
    );

    const existingPreferences = userResult.rows[0]?.preferences || {};

    
    const updatedPreferences = {
      ...existingPreferences,
      ...(timezone && { timezone }),
      ...(working_days && { working_days }),
      ...(planning_start_day !== undefined && { planning_start_day }),
      ...(default_task_duration && { default_task_duration }),
      ...(energy_profile && { energy_profile: { ...existingPreferences.energy_profile, ...energy_profile } }),
      ...(notification_reminders !== undefined && { notification_reminders }),
      ...(reminder_lead_time && { reminder_lead_time }),
      ...(planning_reminder !== undefined && { planning_reminder }),
      ...(retrospective_reminder !== undefined && { retrospective_reminder }),
      ...(quiet_hours_start && { quiet_hours_start }),
      ...(quiet_hours_end && { quiet_hours_end }),
    };

    
    const updateResult = await query(
      `UPDATE users SET 
        preferences = $1, 
        growth_target_hours = COALESCE($2, growth_target_hours),
        timezone = COALESCE($4, timezone),
        updated_at = NOW()
      WHERE id = $3
      RETURNING preferences, growth_target_hours, role, email, name, timezone`,
      [updatedPreferences, growth_target_hours, decoded.userId, timezone]
    );

    
    await query(
      `INSERT INTO logs (user_id, action_type, metadata, created_at)
      VALUES ($1, $2, $3, NOW())`,
      [decoded.userId, 'preferences_updated', JSON.stringify({ oldPreferences: existingPreferences, newPreferences: updatedPreferences })]
    );

    const updatedUser = updateResult.rows[0];

    return Response.json({
      success: true,
      preferences: updatedPreferences,
      growth_target_hours: updatedUser.growthTargetHours,
      role: updatedUser.role,
      email: updatedUser.email,
      name: updatedUser.name,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return Response.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
