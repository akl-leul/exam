// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const TEACHER_AUTH_TOKEN = 'teacher-auth-token'; // Your auth token cookie name

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // List of public API paths that do NOT require teacher authentication
  const publicApiPaths = [
    '/api/submissions/start',
    '/api/exams/[^/]+/public', // Matches /api/exams/:examId/public
    '/api/submissions/[^/]+/questions', // Student fetching questions
    '/api/submissions/[^/]+/submit',    // Student submitting answers
    '/api/submissions/[^/]+/result',    // Student fetching their results
    // Add any other public API routes here
  ];

  // Check if the current path is one of the public API paths
  const isPublicApiPath = publicApiPaths.some(publicPath => {
    if (publicPath.includes('[^/]+')) { // Handle paths with dynamic segments
      const regex = new RegExp(`^${publicPath.replace(/\[\^\/\]\+/g, '[^/]+')}$`);
      return regex.test(pathname);
    }
    return pathname === publicPath;
  });

  if (isPublicApiPath) {
    console.log(`Middleware: Allowing public access to API path: ${pathname}`);
    return NextResponse.next(); // Allow access to public API paths
  }

  // Protect all other /api/teacher routes (or adjust as needed)
  if (pathname.startsWith('/api/teacher')) {
    const authToken = request.cookies.get(TEACHER_AUTH_TOKEN)?.value;
    if (!authToken) {
      console.log(`Middleware: Unauthorized access to ${pathname} - No auth token. Responding 401.`);
      // For API routes, it's better to return a JSON response for 401
      return new NextResponse(
        JSON.stringify({ success: false, message: 'Authentication Required' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    console.log(`Middleware: Authenticated access to teacher API path: ${pathname}`);
  }
  
  // Protect teacher UI routes
  if (pathname.startsWith('/teacher') && pathname !== '/teacher/login') {
     const authToken = request.cookies.get(TEACHER_AUTH_TOKEN)?.value;
     if (!authToken) {
        console.log(`Middleware: Redirecting unauthenticated access to ${pathname} to login.`);
        const loginUrl = new URL('/teacher/login', request.url);
        return NextResponse.redirect(loginUrl);
     }
     console.log(`Middleware: Authenticated access to teacher UI path: ${pathname}`);
  }

  return NextResponse.next(); // Proceed for other paths or if auth passes
}

// Matcher: Apply this middleware to specific paths
export const config = {
  matcher: [
    '/api/:path*', // Apply to all API routes to check for public ones
    '/teacher/:path*' // Apply to teacher UI routes
  ],
};