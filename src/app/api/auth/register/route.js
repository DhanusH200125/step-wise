import { NextResponse } from 'next/server';
import { query, initDatabase } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Handler for new user registration and account creation
export async function POST(req) {
    try {
        
        // Ensure database schema is initialized before proceeding
        await initDatabase();

        const { name, email, password, role } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        
        // Prevent duplicate registrations by checking if the email is already in use
        const existingUser = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return NextResponse.json({ error: 'User already exists' }, { status: 409 });
        }

        
        // Securely hash the user's password before storing it in the database
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        
        const effectiveRole = role || 'Student';

        
        // Insert the new user record and return the created profile data
        const result = await query(
            'INSERT INTO users (name, email, password, role, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, name, email, role, created_at, timezone',
            [name, email, hashedPassword, effectiveRole]
        );

        const user_id = result.rows[0].id;

        
        try {
            // Log the registration event for auditing and analytics
            await query(
                `INSERT INTO logs (user_id, action_type, metadata, created_at)
                VALUES ($1, $2, $3, NOW())`,
                [user_id, 'user_registered', JSON.stringify({ email, role: effectiveRole })]
            );
        } catch (logErr) {
            console.warn('[register] Activity log skipped:', logErr.message);
        }

        return NextResponse.json({ message: 'User created successfully', user: result.rows[0] }, { status: 201 });
    } catch (error) {
        console.error('Registration Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
