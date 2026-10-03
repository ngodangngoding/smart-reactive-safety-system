const NONE = { canRead: false, canCreate: false, canUpdate: false, canDelete: false };
const READ = { ...NONE, canRead: true };
const CRUD = { canRead: true, canCreate: true, canUpdate: true, canDelete: true };

const MENUS = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard" },
  { key: "monitoring", label: "Monitoring", path: "/monitoring" },
  { key: "organization", label: "Organizations", path: "/organizations" },
  { key: "license", label: "Licenses", path: "/licenses" },
  { key: "user", label: "User Management", path: "/users" },
  { key: "worker", label: "Workers", path: "/workers" },
  { key: "workerNode", label: "Device Management", path: "/devices" },
  { key: "telemetry", label: "Telemetry", path: "/telemetry" },
  { key: "incident", label: "Incident History", path: "/incidents" },
  { key: "auditLog", label: "Audit Logs", path: "/audit-logs" },
];

const SUPERADMIN = { organization: CRUD, license: CRUD, user: CRUD, worker: CRUD, workerNode: CRUD, telemetry: READ, incident: CRUD, auditLog: READ };
const ADMIN = { organization: READ, license: NONE, user: NONE, worker: CRUD, workerNode: CRUD, telemetry: READ, incident: { ...READ, canUpdate: true }, auditLog: READ };
const PENDING = Object.fromEntries(MENUS.map((menu) => [menu.key, NONE]));

export function getPermissionMenu(role) {
  const rules = role === "SUPERADMIN" ? SUPERADMIN : role === "ADMIN" ? ADMIN : PENDING;
  return MENUS.map((menu) => ({ ...menu, ...(rules[menu.key] ?? READ) }));
}
