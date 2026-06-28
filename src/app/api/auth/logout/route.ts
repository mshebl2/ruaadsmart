import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    
    // Clear the cookie by setting maxAge to 0 and path to '/'
    response.cookies.set('ruaad_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (e) {
    console.error('Logout error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
