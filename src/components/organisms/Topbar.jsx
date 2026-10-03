"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Bell, LogOut, Menu, PanelLeft } from "lucide-react";
import IconButton from "@/components/atoms/IconButton.jsx";
import Avatar from "@/components/atoms/Avatar.jsx";
import NotificationPanel from "@/components/organisms/NotificationPanel.jsx";
import ThemeToggle from "@/components/organisms/ThemeToggle.jsx";

export default function Topbar({ user, organizationId, activeAlertCount = 0, sidebarOpen = true, onToggleSidebar, onOpenMobileNav, onLogout }) {
  const [now, setNow] = useState(() => new Date());
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const closeNotifications = useCallback(() => setNotificationsOpen(false), []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-[1100] flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-3 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="md:hidden">
          <IconButton icon={Menu} label="Open menu" variant="bordered" aria-haspopup="dialog" onClick={onOpenMobileNav} />
        </span>
        <span className="hidden md:inline-flex">
          <IconButton
            icon={PanelLeft}
            label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            variant="bordered"
            aria-expanded={sidebarOpen}
            onClick={onToggleSidebar}
          />
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <time dateTime={now.toISOString()} className="hidden text-[13px] font-medium tabular-nums text-text-secondary sm:block">
          {format(now, "hh:mm:ss a")}
        </time>

        <ThemeToggle />

        <div className="relative">
          <IconButton
            icon={Bell}
            variant="bordered"
            label={activeAlertCount > 0 ? `${activeAlertCount} active emergency alerts` : "No active alerts"}
            aria-haspopup="dialog"
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen((open) => !open)}
          />
          {activeAlertCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-[5px] -top-[5px] flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] border-2 border-card bg-danger px-[5px] text-[10px] font-bold tabular-nums text-white"
            >
              {activeAlertCount > 9 ? "9+" : activeAlertCount}
            </span>
          )}
          <NotificationPanel organizationId={organizationId} open={notificationsOpen} onClose={closeNotifications} />
        </div>

        <span className="hidden h-7 w-px bg-border sm:block" aria-hidden="true" />

        <div className="flex items-center gap-2.5">
          <Link href="/settings/profile" aria-label="My profile" className="flex items-center gap-2.5 rounded-sm hover:opacity-80">
            <Avatar name={user?.name} photoUrl={user?.avatarUrl} size={34} />
            <div className="hidden leading-tight sm:block">
              <p className="text-[13px] font-semibold text-foreground">{user?.name ?? "..."}</p>
              <p className="text-xs text-muted-foreground">{user?.role === "SUPERADMIN" ? "Super Admin" : "Admin"}</p>
            </div>
          </Link>
          <IconButton icon={LogOut} label="Log out" onClick={onLogout} />
        </div>
      </div>
    </header>
  );
}
