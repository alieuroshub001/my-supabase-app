<<<<<<< HEAD
 //src/app/admin/dashboard/page.tsx
import { protectRouteSSR } from "@/utils/auth/routeProtection.server";
=======
import { protectRouteSSR } from "@/utils/auth/routeProtection.ts";
>>>>>>> eea03c135331f4e5e75a46a601d7934ddc9b1bf5
import AdminDashboard from "@/components/Admin/Dashboard";

export default async function AdminPage() {
  // Protect the route - only admin users can access
  await protectRouteSSR({ allowedRoles: ['admin'] });

  return <AdminDashboard />;
}