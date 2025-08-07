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
      console.error('Error exchanging code for session:', error);
      // Redirect to login with error
      return NextResponse.redirect(requestUrl.origin + "/login?error=verification_failed");
    }
    
    if (data.user) {
      console.log('User verified successfully:', data.user.id);
    }
  }

  // Fallback to home
  return NextResponse.redirect(requestUrl.origin + "/");
}