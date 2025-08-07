import React, { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "admin" | "hr" | "team" | "client";

interface SidebarProps {
  role: Role;
  currentPath?: string;
}

const linksByRole: Record<Role, { label: string; href: string }[]> = {
  admin: [
    { label: "Dashboard Home", href: "/dashboard" },
    { label: "Users", href: "/admin/users" },
    { label: "Projects", href: "/admin/projects" },
    { label: "Tasks", href: "/admin/tasks" },
    { label: "HR", href: "/admin/hr" },
    { label: "Reports", href: "/admin/reports" },
    { label: "Channels", href: "/admin/channels" },
    { label: "Notifications", href: "/admin/notifications" },
    { label: "Calendar", href: "/admin/calendar" },
  ],
  hr: [
    { label: "Dashboard Home", href: "/dashboard" },
    { label: "Employees", href: "/hr/employees" },
    { label: "Employee Documents", href: "/hr/documents" },
    { label: "Attendance", href: "/hr/attendance" },
    { label: "Leave Requests", href: "/hr/leave-requests" },
    { label: "Onboarding", href: "/hr/onboarding" },
    { label: "Reports", href: "/hr/reports" },
    { label: "Notifications", href: "/hr/notifications" },
  ],
  team: [
    { label: "Dashboard Home", href: "/dashboard" },
    { label: "My Profile", href: "/team/profile" },
    { label: "My Projects", href: "/team/projects" },
    { label: "My Tasks", href: "/team/tasks" },
    { label: "Attendance", href: "/team/attendance" },
    { label: "Leave Requests", href: "/team/leave-requests" },
    { label: "Timesheets", href: "/team/timesheets" },
    { label: "Channels", href: "/team/channels" },
    { label: "Notifications", href: "/team/notifications" },
  ],
  client: [
    { label: "Dashboard Home", href: "/dashboard" },
    { label: "My Projects", href: "/client/projects" },
    { label: "Project Tasks", href: "/client/tasks" },
    { label: "Messages", href: "/client/messages" },
    { label: "Notifications", href: "/client/notifications" },
  ],
};

export const Sidebar: React.FC<SidebarProps> = ({ role, currentPath }) => {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const links = linksByRole[role];

  return (
    <aside
      className={`h-screen bg-white border-r transition-all duration-200 ${
        collapsed ? "w-16" : "w-56"
      } flex flex-col`}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <span className={`font-bold text-lg transition-all ${collapsed ? "hidden" : "block"}`}>
          {role.charAt(0).toUpperCase() + role.slice(1)} Panel
        </span>
        <button
          className="p-1 rounded hover:bg-gray-200"
          onClick={() => setCollapsed((c) => !c)}
          aria-label="Toggle sidebar"
        >
          <span>{collapsed ? "»" : "«"}</span>
        </button>
      </div>
      <nav className="flex-1 py-2">
        {links.map((link) => (
          <button
            key={link.href}
            onClick={() => router.push(link.href)}
            className={`w-full text-left px-4 py-2 my-1 rounded transition-colors ${
              currentPath === link.href
                ? "bg-blue-100 text-blue-700 font-semibold"
                : "hover:bg-gray-100"
            } ${collapsed ? "text-xs px-2" : ""}`}
          >
            {collapsed ? link.label[0] : link.label}
          </button>
        ))}
      </nav>
    </aside>
  );
};
export default Sidebar;