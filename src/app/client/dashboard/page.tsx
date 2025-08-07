//src/app/client/dashboard/page.tsx
import { protectRoute } from "@/utils/auth/routeProtection.client";
import ClientDashboard from "@/components/Client/Dashboard";

export default async function ClientDashboardPage() {
  // Protect the route - only client and admin users can access
  await protectRoute({ allowedRoles: ['client', 'admin'] });

  return <ClientDashboard />;
}