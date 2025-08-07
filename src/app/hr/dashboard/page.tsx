<<<<<<< HEAD
 //src/app/hr/dashboard/page.tsx
import { protectRouteSSR } from "@/utils/auth/routeProtection.server";
=======
import { protectRouteSSR } from "@/utils/auth/routeProtection.ts";
>>>>>>> eea03c135331f4e5e75a46a601d7934ddc9b1bf5
import HRDashboard from "@/components/HR/Dashboard";

export default async function HRPage() {
  // Protect the route - only HR and admin users can access
  await protectRouteSSR({ allowedRoles: ['hr', 'admin'] });

  return <HRDashboard />;
}