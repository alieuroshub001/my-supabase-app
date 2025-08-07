//app/auth/callback/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { getDashboardRoute } from "@/utils/auth/routeProtection";

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
      
              // Get user profile to determine dashboard route
        try {
          const supabaseClient = await supabase;
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
        
        if (profile?.role) {
          const dashboardRoute = getDashboardRoute(profile.role);
          return NextResponse.redirect(requestUrl.origin + dashboardRoute);
        }
      } catch (profileError) {
        console.error('Error getting user profile:', profileError);
      }
    }
  }

  // Fallback to home
  return NextResponse.redirect(requestUrl.origin + "/");
}