import { createClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type UserRole = 'admin' | 'hr' | 'team' | 'client';

export interface ProtectedRouteConfig {
  allowedRoles: UserRole[];
  redirectTo?: string;
}

// CLIENT-SIDE: For use in client components only
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
  
  if (!profile) {
    console.log('No profile found, redirecting to root for profile creation');
    redirect('/');
  }
  
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

// SERVER-SIDE: For use in server components/pages
export async function checkUserRoleSSR() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => cookies().get(key)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
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
    console.error('SSR: Error checking user role:', error);
    return { user: null, profile: null, role: null };
  }
}

export async function protectRouteSSR(config: ProtectedRouteConfig) {
  const { user, profile, role } = await checkUserRoleSSR();
  
  console.log('SSR Route protection check:', {
    hasUser: !!user,
    hasProfile: !!profile,
    userRole: role,
    allowedRoles: config.allowedRoles
  });
  
  if (!user) {
    console.log('SSR: No user found, redirecting to login');
    redirect('/login');
  }
  
  if (!profile) {
    console.log('SSR: No profile found, redirecting to root for profile creation');
    redirect('/');
  }
  
  if (!role || !config.allowedRoles.includes(role)) {
    console.log('SSR: User role not allowed, redirecting to appropriate dashboard');
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
  
  console.log('SSR: Route access granted');
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