//app/auth/callback/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { data, error } = await (await supabase).auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(requestUrl.origin + "/login?error=auth_failed");
    }

    // Give the database trigger a moment to create the profile
    if (data.user) {
      console.log('User authenticated via email verification:', data.user.id);
      // Small delay to allow database trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin + "/dashboard");
}