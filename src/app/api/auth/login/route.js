import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}
const JWT_SECRET = process.env.JWT_SECRET || 'stepwisejwtsecretkey1234';

// Handler for user login and JWT token issuance
export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }


    // Check if a user exists with the provided email address
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const user = result.rows[0];


    // Verify the provided password against the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }


    // Generate a secure JWT token containing user identity and role
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );



    try {
      // Record the successful login attempt in the activity logs
      await query(
        `INSERT INTO logs (user_id, action_type, metadata, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [user.id, 'user_login', JSON.stringify({ email, timestamp: new Date() })]
      );
    } catch (logErr) {

      console.warn('[login] Activity log skipped:', logErr.message);
    }



    const isProduction = process.env.NODE_ENV === 'production';

    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
        timezone: user.timezone,
      },
      token,
    });

    // Securely set the auth token in an HTTP-only cookie for state management
    response.cookies.set('token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 24 * 60 * 60,
      sameSite: 'lax',
      secure: isProduction,
    });

    return response;

  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
