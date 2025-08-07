// src/app/client/layout.tsx
import { protectRouteSSR } from "@/utils/auth/routeProtection.server";
import Sidebar from "@/components/Client/Sidebar";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protect the layout - only client and admin users can access
  await protectRouteSSR({ allowedRoles: ['client', 'admin'] });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Collapsible Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Client Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Client
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