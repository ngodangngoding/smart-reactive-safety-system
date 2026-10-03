"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar, { MobileSidebar } from "@/components/organisms/Sidebar.jsx";
import AppShellSkeleton from "@/components/organisms/AppShellSkeleton.jsx";
import Topbar from "@/components/organisms/Topbar.jsx";
import { AuthContext } from "./AuthContext.js";
import { getCurrentUser, isAuthenticated, logout } from "@/services/authService.js";
import { isLicenseBlockError } from "@/services/apiService.js";
import { useOrgContext } from "@/lib/orgContext.js";
import { ORG_CONTEXT_CHANGED_EVENT } from "@/services/organizationService.js";
import { getIncidents } from "@/services/incidentService.js";
import { syncFromMe } from "@/lib/session.js";
import { getMainContentClassName } from "@/lib/mainLayoutStyles.js";

const POLL_INTERVAL_MS = 15000;

export default function MainLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState({ orgKey: null, count: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === "undefined" || window.localStorage.getItem("sidebar_collapsed") !== "true");
  const { actingAsOrg, organizationId, orgKey, isSuperAdmin } = useOrgContext();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    getCurrentUser()
      .then((me) => {
        if (me.user.role === "PENDING") {
          router.replace("/pending");
          return;
        }
        if (syncFromMe(me)) window.dispatchEvent(new Event(ORG_CONTEXT_CHANGED_EVENT));
        setAuth({ user: me.user, permissions: me.permissions });
      })
      .catch((error) => {
        if (isLicenseBlockError(error)) return;
        router.replace("/login");
      });
  }, [router, orgKey]);

  useEffect(() => {
    if (!auth) return undefined;

    let cancelled = false;
    const refresh = () => {
      getIncidents({ status: "ACTIVE", pageSize: 1, organizationId: organizationId || undefined })
        .then((page) => {
          if (!cancelled) setActiveAlerts({ orgKey, count: page.pagination.total });
        })
        .catch(() => {
          if (!cancelled) setActiveAlerts({ orgKey, count: 0 });
        });
    };

    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [auth, organizationId, orgKey]);

  const openMobileNav = () => setMobileNavOpen(true);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  const toggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    window.localStorage.setItem("sidebar_collapsed", String(!next));
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const authValue = { ...auth, updateUser: (patch) => setAuth((current) => ({ ...current, user: { ...current.user, ...patch } })) };

  if (!auth) return <AppShellSkeleton />;

  const orgLabel = actingAsOrg
    ? actingAsOrg.name
    : auth.user.role === "SUPERADMIN"
      ? "All Organizations"
      : (auth.user.organization?.name ?? "");

  return (
    <AuthContext.Provider value={authValue}>
      <div key={orgKey} className="min-h-screen bg-background">
        <Sidebar orgLabel={orgLabel} open={sidebarOpen} isSuperAdmin={isSuperAdmin} />
        <MobileSidebar orgLabel={orgLabel} open={mobileNavOpen} isSuperAdmin={isSuperAdmin} onClose={closeMobileNav} />
        <div className={getMainContentClassName(sidebarOpen)}>
          <Topbar
            user={auth.user}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={toggleSidebar}
            onOpenMobileNav={openMobileNav}
            onLogout={handleLogout}
            activeAlertCount={activeAlerts.orgKey === orgKey ? activeAlerts.count : 0}
            organizationId={organizationId}
          />
          <main className="flex flex-1 flex-col gap-5 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
