import { protectRoute } from "@/utils/auth/routeProtection";
import ClientDashboard from "@/components/Client/Dashboard";

export default async function ClientPage() {
  // Protect the route - only client and admin users can access
  await protectRoute({ allowedRoles: ['client', 'admin'] });
  
  return <ClientDashboard />;
}