import { protectRouteSSR } from "@/utils/auth/routeProtection";
import AdminDashboard from "@/components/Admin/Dashboard";

export default async function AdminPage() {
  // Protect the route - only admin users can access
  await protectRouteSSR({ allowedRoles: ['admin'] });
  
  return <AdminDashboard />;
}