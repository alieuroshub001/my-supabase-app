import { protectRouteSSR } from "@/utils/auth/routeProtection";
import HRDashboard from "@/components/HR/Dashboard";

export default async function HRPage() {
  // Protect the route - only HR and admin users can access
  await protectRouteSSR({ allowedRoles: ['hr', 'admin'] });
  
  return <HRDashboard />;
}