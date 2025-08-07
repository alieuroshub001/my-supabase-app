import UserManagement from "@/components/admin/UserManagement";

export default function AdminUsersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <UserManagement currentUserRole="admin" />
    </div>
  );
}