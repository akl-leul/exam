// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const TEACHER_AUTH_TOKEN = 'teacher-auth-token';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /teacher routes except /teacher/login
  if (pathname.startsWith('/teacher') && pathname !== '/teacher/login') {
    const authToken = request.cookies.get(TEACHER_AUTH_TOKEN)?.value;
    if (!authToken) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/teacher/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/teacher/:path*'],
};