import { createClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";

export type UserRole = 'admin' | 'hr' | 'team' | 'client';

export interface ProtectedRouteConfig {
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export async function checkUserRole() {
  const supabase = createClient();
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { user: null, profile: null, role: null };
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) {
      return { user, profile: null, role: null };
    }
    return { user, profile, role: profile.role as UserRole };
  } catch (error) {
    console.error('Error checking user role:', error);
    return { user: null, profile: null, role: null };
  }
}

export async function protectRoute(config: ProtectedRouteConfig) {
  const { user, profile, role } = await checkUserRole();
  if (!user) redirect('/login');
  
  // If no profile exists, allow the component to handle profile creation
  // Only redirect if we have a profile but wrong role
  if (profile && role && !config.allowedRoles.includes(role)) {
    if (role === 'admin') redirect('/admin/dashboard');
    else if (role === 'hr') redirect('/hr/dashboard');
    else if (role === 'team') redirect('/team/dashboard');
    else if (role === 'client') redirect('/client/dashboard');
    else redirect('/');
  }
  
  return { user, profile, role };
}

// Optionally, if you want to use getDashboardRoute in client components:
export function getDashboardRoute(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'hr':
      return '/hr/dashboard';
    case 'team':
      return '/team/dashboard';
    case 'client':
      return '/client/dashboard';
    default:
      return '/';
  }
}