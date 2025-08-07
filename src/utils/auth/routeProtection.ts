import { createClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";

export type UserRole = 'admin' | 'hr' | 'team' | 'client';

export interface ProtectedRouteConfig {
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export async function checkUserRole(): Promise<{ user: any; profile: any; role: UserRole | null }> {
  const supabase = createClient();
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { user: null, profile: null, role: null };
    }

    // Get user profile
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
  
  console.log('Route protection check:', {
    hasUser: !!user,
    hasProfile: !!profile,
    userRole: role,
    allowedRoles: config.allowedRoles
  });
  
  // If no user, redirect to login
  if (!user) {
    console.log('No user found, redirecting to login');
    redirect('/login');
  }

  // If no profile, redirect to profile setup
  if (!profile) {
    console.log('No profile found, redirecting to root for profile creation');
    redirect('/');
  }

  // Check if user has required role
  if (!role || !config.allowedRoles.includes(role)) {
    console.log('User role not allowed, redirecting to appropriate dashboard');
    // Redirect to appropriate dashboard based on user's role
    if (role === 'admin') {
      redirect('/admin/dashboard');
    } else if (role === 'hr') {
      redirect('/hr/dashboard');
    } else if (role === 'team') {
      redirect('/team/dashboard');
    } else if (role === 'client') {
      redirect('/client/dashboard');
    } else {
      redirect('/');
    }
  }

  console.log('Route access granted');
  return { user, profile, role };
}

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

export function isRoleAllowed(userRole: UserRole | null, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}