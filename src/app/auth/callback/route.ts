//app/auth/callback/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(requestUrl.origin + "/login?error=auth_failed");
    }

    // Give the database trigger a moment to create the profile
    let redirectPath = "/client/dashboard?refresh=1"; // safe default

    try {
      if (data && data.user) {
        console.log('User authenticated via email verification:', data.user.id);
        // Small delay to allow database trigger to complete
        await new Promise(resolve => setTimeout(resolve, 800));

        // Try to load profile to detect role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        const role = profile?.role as 'admin' | 'hr' | 'team' | 'client' | undefined;
        if (role === 'admin') redirectPath = "/admin/dashboard?refresh=1";
        else if (role === 'hr') redirectPath = "/hr/dashboard?refresh=1";
        else if (role === 'team') redirectPath = "/team/dashboard?refresh=1";
        else redirectPath = "/client/dashboard?refresh=1";
      }
    } catch (e) {
      console.error('Auth callback: profile lookup failed, falling back to default dashboard');
    }

    return NextResponse.redirect(requestUrl.origin + redirectPath);
  }

  // Fallback to home
  return NextResponse.redirect(requestUrl.origin + "/");
}