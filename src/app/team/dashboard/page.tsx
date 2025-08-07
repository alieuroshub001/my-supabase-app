<<<<<<< HEAD
 //src/app/team/dashboard/page.tsx
import { protectRouteSSR } from "@/utils/auth/routeProtection.server";
=======
import { protectRouteSSR } from "@/utils/auth/routeProtection.ts";
>>>>>>> eea03c135331f4e5e75a46a601d7934ddc9b1bf5
import TeamDashboard from "@/components/Team/Dashboard";

export default async function TeamPage() {
  // Protect the route - team, HR, and admin users can access
  await protectRouteSSR({ allowedRoles: ['team', 'hr', 'admin'] });

  return <TeamDashboard />;
}