"use client";

import { useEffect } from "react";
import { ShieldCheck, X } from "lucide-react";
import IconButton from "@/components/atoms/IconButton.jsx";
import SidebarNav from "./SidebarNav.jsx";
import SidebarOrgSwitcher from "./SidebarOrgSwitcher.jsx";

function SidebarBody({ orgLabel, isSuperAdmin, onClose }) {
  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-border-subtle px-2 pb-4 pt-1">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-primary text-white">
          <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight text-foreground">Lone Worker Safety</p>
          <p className="truncate text-xs text-muted-foreground">{orgLabel}</p>
        </div>
        {onClose && <IconButton icon={X} label="Close menu" onClick={onClose} />}
      </div>

      <SidebarNav onNavigate={onClose} />

      {isSuperAdmin && <SidebarOrgSwitcher />}
    </>
  );
}

export default function Sidebar({ orgLabel, open = true, isSuperAdmin = false }) {
  return (
    <aside
      aria-label="Sidebar"
      className={`${open ? "hidden md:flex" : "hidden"} fixed inset-y-0 left-0 z-40 w-60 flex-col gap-5 overflow-clip border-r border-border bg-card px-3 py-4`}
    >
      <SidebarBody orgLabel={orgLabel} isSuperAdmin={isSuperAdmin} />
    </aside>
  );
}

export function MobileSidebar({ orgLabel, isSuperAdmin = false, open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const wide = window.matchMedia("(min-width: 768px)");
    const onKeyDown = (event) => event.key === "Escape" && onClose();
    const onWide = (event) => event.matches && onClose();

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    wide.addEventListener("change", onWide);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      wide.removeEventListener("change", onWide);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed top-0 right-0 bottom-0 left-0 z-[2000] flex flex-col gap-5 overflow-y-auto overflow-x-hidden bg-card px-3 py-4 md:hidden"
    >
      <SidebarBody orgLabel={orgLabel} isSuperAdmin={isSuperAdmin} onClose={onClose} />
    </aside>
  );
}
