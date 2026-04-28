import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';
import bcrypt from 'bcryptjs';

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
    const { current_password, new_password, confirm_password } = body;

    // Validate that all required password fields are provided
    if (!current_password || !new_password || !confirm_password) {
      return Response.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (new_password !== confirm_password) {
      return Response.json(
        { error: 'New password and confirm password do not match' },
        { status: 400 }
      );
    }

    // Enforce strong password complexity requirements
    if (new_password.length < 8) {
      return Response.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (!/\d/.test(new_password)) {
      return Response.json(
        { error: 'Password must contain at least one number' },
        { status: 400 }
      );
    }

    if (!/[a-zA-Z]/.test(new_password)) {
      return Response.json(
        { error: 'Password must contain at least one letter' },
        { status: 400 }
      );
    }

    
    const result = await query(
      'SELECT password FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify the existing password against the database record
    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(current_password, user.password);

    if (!passwordMatch) {
      return Response.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Securely hash the new password with a generated salt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    // Update the user's password record in the database
    await query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, decoded.userId]
    );

    // Log the password change event for security auditing
    await query(
      `INSERT INTO logs (user_id, action_type, metadata, created_at)
      VALUES ($1, $2, $3, NOW())`,
      [decoded.userId, 'password_changed', JSON.stringify({ timestamp: new Date() })]
    );

    return Response.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return Response.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
