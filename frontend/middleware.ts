import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if user is on login page
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.next();
  }

  // For all other pages, check auth status via session cookie
  const hasSession = request.cookies.has('connect.sid');

  if (!hasSession && !request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
