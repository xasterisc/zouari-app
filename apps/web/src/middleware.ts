import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Check for the session cookie
  const sessionToken = request.cookies.get('better-auth.session_token');

  // If no cookie, they are definitely not logged in. Redirect to login.
  if (!sessionToken) {
    const url = new URL('/login', request.url);
    url.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // A cookie exists.
  // This is a high-performance, "dumb" check. We let the request continue.
  return NextResponse.next();
}

export const config = {
  /*
   * Match all request paths that should be protected.
   * This is more efficient and maintainable than a complex regex.
   *
   * This block matches:
   * - /dashboard
   * - /dashboard/settings
   * - /dashboard/admin/users
   * - etc.
   */
  matcher: [
    '/dashboard/:path*',
    // Add more protected top-level routes here
    // '/admin/:path*',
  ],
};
