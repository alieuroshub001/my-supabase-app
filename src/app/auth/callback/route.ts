//app/auth/callback/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    // Try to get a response object from exchangeCodeForSession (if supported by your supabase/ssr version)
    const result = await (await supabase).auth.exchangeCodeForSession(code);
    const { data, error, response } = result;

    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(requestUrl.origin + "/login?error=auth_failed");
    }

    // Give the database trigger a moment to create the profile
    if (data && data.user) {
      console.log('User authenticated via email verification:', data.user.id);
      // Small delay to allow database trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // If a response object is returned, use it to set cookies and redirect
    if (response) {
      response.headers.set('Location', requestUrl.origin + "/dashboard?refresh=1");
      response.status = 302;
      return response;
    }

    // Otherwise, redirect with a refresh param to force a reload on dashboard
    return NextResponse.redirect(requestUrl.origin + "/dashboard?refresh=1");
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin + "/dashboard");
}