import { protectRouteSSR } from "@/utils/auth/routeProtection.ts";
import ClientDashboard from "@/components/Client/Dashboard";

export default async function ClientPage() {
  // Protect the route - only client and admin users can access
  await protectRouteSSR({ allowedRoles: ['client', 'admin'] });
  
  return <ClientDashboard />;
}