//src/utils/auth/routeProtection.shared.ts

export type UserRole = 'admin' | 'hr' | 'team' | 'client';

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