//src/app/client/dashboard/page.tsx
import { protectRouteSSR } from "@/utils/auth/routeProtection.server";
import ClientDashboard from "@/components/Client/Dashboard";

export default async function ClientDashboardPage() {
  // Protect the route - only client and admin users can access
  await protectRouteSSR({ allowedRoles: ['client', 'admin'] });

  return <ClientDashboard />;
}