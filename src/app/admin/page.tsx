 //src/app/admin/dashboard/page.tsx
import { protectRouteSSR } from "@/utils/auth/routeProtection.server";
import AdminDashboard from "@/components/Admin/Dashboard";

export default async function AdminPage() {
  // Protect the route - only admin users can access
  await protectRouteSSR({ allowedRoles: ['admin'] });

  return <AdminDashboard />;
}