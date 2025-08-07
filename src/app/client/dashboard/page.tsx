<<<<<<< HEAD
//src/app/client/dashboard/page.tsx
import { protectRoute } from "@/utils/auth/routeProtection.client";
=======
import { protectRouteSSR } from "@/utils/auth/routeProtection.ts";
>>>>>>> eea03c135331f4e5e75a46a601d7934ddc9b1bf5
import ClientDashboard from "@/components/Client/Dashboard";

export default async function ClientDashboardPage() {
  // Protect the route - only client and admin users can access
  await protectRoute({ allowedRoles: ['client', 'admin'] });

  return <ClientDashboard />;
}