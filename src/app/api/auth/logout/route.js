import { NextResponse } from 'next/server';

// Handler for user logout by clearing the authentication cookie
export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });

  // Invalidate the session cookie by setting its maxAge to 0
  response.cookies.set('token', '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   0,
    path:     '/',
  });

  return response;
}