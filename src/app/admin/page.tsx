import { protectRoute } from "@/utils/auth/routeProtection.ts";
import AdminDashboard from "@/components/Admin/Dashboard";

export default async function AdminPage() {
  // Protect the route - only admin users can access
  await protectRoute({ allowedRoles: ['admin'] });
  
  return <AdminDashboard />;
}