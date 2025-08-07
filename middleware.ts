import { createClient } from "@/utils/supabase/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.log('Middleware check:', {
    pathname: request.nextUrl.pathname,
    hasSession: !!session,
    userAgent: request.headers.get('user-agent')?.substring(0, 50)
  });

  // Protect dashboard routes
  if (
    !session &&
    (request.nextUrl.pathname.startsWith("/dashboard") ||
      request.nextUrl.pathname.startsWith("/profile"))
  ) {
    console.log('No session, redirecting to login');
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect away from auth pages if already logged in
  if (
    session &&
    (request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.startsWith("/signup") ||
      request.nextUrl.pathname.startsWith("/otp"))
  ) {
    console.log('Session exists, redirecting away from auth pages');
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};