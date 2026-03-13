import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/utils/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'stepwise_jwt_secret_key_1234';

// Handler for retrieving the authenticated user's profile information
export async function GET(request) {
    try {
        const user = getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch essential user details from the database by ID
        const result = await query(
            'SELECT id, name, email, role, timezone, created_at FROM users WHERE id = $1',
            [user.userId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Fetch Profile Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Handler for updating user profile details
export async function PATCH(request) {
    try {
        const user = getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, email, timezone } = await request.json();


        // Perform the partial update of user information and return the new record
        const result = await query(
            'UPDATE users SET name = $1, email = $2, timezone = $3 WHERE id = $4 RETURNING id, name, email, role, timezone, created_at',
            [name, email, timezone, user.userId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Profile updated', user: result.rows[0] });
    } catch (error) {
        console.error('Update Profile Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Handler for permanent account deletion and data cleanup
export async function DELETE(request) {
    try {
        const user = getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const uid = user.userId;


        // Cascading deletion of all user-related data across multiple tables
        await query('DELETE FROM logs WHERE task_id IN (SELECT id FROM tasks WHERE user_id = $1)', [uid]);
        await query('DELETE FROM tasks WHERE user_id = $1', [uid]);
        await query('DELETE FROM routines WHERE user_id = $1', [uid]);
        await query('DELETE FROM notifications WHERE user_id = $1', [uid]);
        await query('DELETE FROM schedules WHERE user_id = $1', [uid]);
        const delResult = await query('DELETE FROM users WHERE id = $1', [uid]);

        if (delResult.rowCount === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }


        // Invalidate the session cookie after successful account deletion
        const response = NextResponse.json({ message: 'Account deleted' });
        response.cookies.set('token', '', { httpOnly: true, expires: new Date(0) });

        return response;
    } catch (error) {
        console.error('Delete Account Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
