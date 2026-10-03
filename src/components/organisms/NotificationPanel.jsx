"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import Badge from "@/components/atoms/Badge.jsx";
import EmptyState from "@/components/atoms/EmptyState.jsx";
import { getIncidents } from "@/services/incidentService.js";

export default function NotificationPanel({ organizationId, open, onClose }) {
  const panelRef = useRef(null);
  const [state, setState] = useState({ items: [], total: 0, status: "loading" });

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    getIncidents({ status: "ACTIVE", pageSize: 8, organizationId: organizationId || undefined })
      .then((page) => !cancelled && setState({ items: page.items, total: page.pagination.total, status: "ready" }))
      .catch(() => !cancelled && setState({ items: [], total: 0, status: "error" }));

    const onKeyDown = (event) => event.key === "Escape" && onClose();
    const onPointerDown = (event) => {
      if (!panelRef.current?.parentElement?.contains(event.target)) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [organizationId, open, onClose]);

  if (!open) return null;

  const { items, total, status } = state;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Notifications"
      className="fixed inset-x-3 top-[72px] z-[1100] flex max-h-[70vh] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-overlay sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-[380px] sm:max-w-[calc(100vw-2rem)]"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border-subtle px-4">
        <h2 className="text-sm font-bold text-foreground">Notifications</h2>
        {total > 0 && (
          <Badge variant="danger" withDot>
            {total} Urgent
          </Badge>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {status === "loading" ? (
          <div className="animate-pulse space-y-2 p-3" role="status" aria-label="Loading notifications">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-14 rounded-md bg-border-subtle" />
            ))}
          </div>
        ) : status === "error" ? (
          <p className="p-6 text-center text-sm text-danger">Could not load notifications.</p>
        ) : items.length === 0 ? (
          <EmptyState icon={ShieldCheck} tone="success" title="No active emergencies" description="Every monitored worker is reporting normally." />
        ) : (
          <ul>
            {items.map((incident) => (
              <li key={incident.id} className="border-b border-border-subtle last:border-b-0">
                <Link href={`/incidents/${incident.id}`} onClick={onClose} className="flex items-start gap-3 bg-danger-tint px-4 py-3 hover:bg-danger-soft">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-danger-soft">
                    <ShieldAlert className="h-4 w-4 text-danger" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-foreground">
                      Emergency: {incident.worker?.name ?? "Unknown worker"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {incident.worker?.workerCode ?? "-"} - {formatDistanceToNow(new Date(incident.startedAt), { addSuffix: true })}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link href="/incidents" onClick={onClose} className="shrink-0 border-t border-border-subtle px-4 py-2.5 text-center text-xs font-semibold text-primary hover:bg-surface-subtle">
        View all incidents
      </Link>
    </div>
  );
}
