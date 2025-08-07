import { protectRoute } from "@/utils/auth/routeProtection";
import Link from "next/link";

export default async function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protect the layout - only HR and admin users can access
  await protectRoute({ allowedRoles: ['hr', 'admin'] });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HR Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <Link href="/hr" className="text-xl font-bold text-gray-900">
                HR Portal
              </Link>
              <nav className="flex space-x-6">
                <Link 
                  href="/hr" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/hr/employees" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Employees
                </Link>
                <Link 
                  href="/hr/leave" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Leave Requests
                </Link>
                <Link 
                  href="/hr/reports" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Reports
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                HR
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