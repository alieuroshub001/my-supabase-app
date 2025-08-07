import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type UserRole = 'admin' | 'hr' | 'team' | 'client';

export interface ProtectedRouteConfig {
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export async function checkUserRoleSSR() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (key) => (await cookies()).get(key)?.value,
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
  if (!user) redirect('/login');
  if (!profile) redirect('/');
  if (!role || !config.allowedRoles.includes(role)) {
    if (role === 'admin') redirect('/admin/dashboard');
    else if (role === 'hr') redirect('/hr/dashboard');
    else if (role === 'team') redirect('/team/dashboard');
    else if (role === 'client') redirect('/client/dashboard');
    else redirect('/');
  }
  return { user, profile, role };
}

// Optionally, if you want to use getDashboardRoute in server components:
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
