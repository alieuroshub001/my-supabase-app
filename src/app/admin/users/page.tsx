import { protectRouteSSR } from "@/utils/auth/routeProtection.server";
import UserManagementClientWrapper from "./UserManagementClientWrapper";

export default async function AdminUsersPage() {
  await protectRouteSSR({ allowedRoles: ['admin'] });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Manage system users and their roles</p>
      </div>
      <UserManagementClientWrapper />
    </div>
  );
}