import { LayoutDashboard, History, Users, Cpu, Building2, UserCog, KeyRound, Radar, ScrollText, Settings } from "lucide-react";

export const NAV_GROUPS = [
  {
    label: "Monitoring",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/monitoring", label: "Monitoring", icon: Radar, menu: "monitoring" },
      { href: "/incidents", label: "Incident History", icon: History, menu: "incident" },
      { href: "/audit-logs", label: "Audit Logs", icon: ScrollText, menu: "auditLog" },
    ],
  },
  {
    label: "Field",
    items: [
      { href: "/workers", label: "Workers", icon: Users, menu: "worker" },
      { href: "/devices", label: "Device Management", icon: Cpu, menu: "workerNode" },
    ],
  },
  {
    label: "Administration",
    homeOnly: true,
    items: [
      { href: "/organizations", label: "Organizations", icon: Building2 },
      { href: "/licenses", label: "Licenses", icon: KeyRound },
      { href: "/users", label: "User Management", icon: UserCog },
    ],
  },
  {
    label: "Account",
    always: true,
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];
