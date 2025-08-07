// src/app/hr/layout.tsx
import { protectRouteSSR } from "@/utils/auth/routeProtection.server";
import Sidebar from "@/components/HR/Sidebar";

export default async function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protect the layout - only HR and admin users can access
  await protectRouteSSR({ allowedRoles: ['hr', 'admin'] });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Collapsible Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HR Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  HR
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