import { protectRoute } from "@/utils/auth/routeProtection.ts";
import Link from "next/link";

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protect the layout - team, HR, and admin users can access
  await protectRoute({ allowedRoles: ['team', 'hr', 'admin'] });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Team Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <Link href="/team" className="text-xl font-bold text-gray-900">
                Team Portal
              </Link>
              <nav className="flex space-x-6">
                <Link 
                  href="/team" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/team/projects" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Projects
                </Link>
                <Link 
                  href="/team/tasks" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Tasks
                </Link>
                <Link 
                  href="/team/time" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Time Tracking
                </Link>
                <Link 
                  href="/team/leave" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Leave
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Team
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}