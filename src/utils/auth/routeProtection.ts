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
  
  // If no user, redirect to login
  if (!user) {
    redirect('/login');
  }

  // If no profile, redirect to profile setup
  if (!profile) {
    redirect('/dashboard');
  }

  // Check if user has required role
  if (!role || !config.allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on user's role
    if (role === 'admin') {
      redirect('/admin');
    } else if (role === 'hr') {
      redirect('/hr');
    } else if (role === 'team') {
      redirect('/team');
    } else if (role === 'client') {
      redirect('/client');
    } else {
      redirect('/dashboard');
    }
  }

  return { user, profile, role };
}

export function getDashboardRoute(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'hr':
      return '/hr';
    case 'team':
      return '/team';
    case 'client':
      return '/client';
    default:
      return '/dashboard';
  }
}

export function isRoleAllowed(userRole: UserRole | null, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}