import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('ruaad_session')?.value;
  const expectedToken = process.env.SESSION_TOKEN || 'ruaad_smart_secure_session_token_2026_xyz';

  // Define public paths that bypass authentication
  const isPublicPath = 
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/login') ||
    pathname === '/login' ||
    pathname === '/favicon.ico' ||
    pathname === '/logo.jpg' ||
    pathname === '/stamp.png' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js';

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Redirect to login if token is missing or incorrect
  if (!sessionToken || sessionToken !== expectedToken) {
    const loginUrl = new URL('/login', request.url);
    // Remember the page the user was trying to access
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Limit the proxy to match all routes except static assets
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
