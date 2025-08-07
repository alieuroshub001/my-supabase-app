// src/app/team/layout.tsx
import { protectRouteSSR } from "@/utils/auth/routeProtection.server";
import TeamSidebar from "@/components/Team/Sidebar";

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protect the layout - team, HR, and admin users can access
  await protectRouteSSR({ allowedRoles: ['team', 'hr', 'admin'] });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Collapsible Sidebar */}
      <TeamSidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Team Header - Simplified since we have sidebar now */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-8">
                <h1 className="text-xl font-bold text-gray-900">
                  Team Dashboard
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Team
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}