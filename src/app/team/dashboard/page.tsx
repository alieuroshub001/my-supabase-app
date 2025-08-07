import { protectRouteSSR } from "@/utils/auth/routeProtection";
import TeamDashboard from "@/components/Team/Dashboard";

export default async function TeamPage() {
  // Protect the route - team, HR, and admin users can access
  await protectRouteSSR({ allowedRoles: ['team', 'hr', 'admin'] });
  
  return <TeamDashboard />;
}