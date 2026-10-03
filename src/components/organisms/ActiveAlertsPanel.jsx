"use client";

import { formatDistanceToNow } from "date-fns";
import { MapPin, ShieldAlert, ShieldCheck, VolumeX } from "lucide-react";
import Badge from "@/components/atoms/Badge.jsx";
import Button from "@/components/atoms/Button.jsx";
import EmptyState from "@/components/atoms/EmptyState.jsx";

function formatLocation(incident) {
  if (incident.latitude == null || incident.longitude == null) return "Location unavailable";
  return `${Number(incident.latitude).toFixed(5)}, ${Number(incident.longitude).toFixed(5)}`;
}

export default function ActiveAlertsPanel({ incidents, loading, onResolve, resolvingId, alarmSounding, onMuteAlarm }) {
  return (
    <section id="active-alerts" className="flex h-full min-h-[240px] flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-border-subtle px-4 py-2 sm:px-5">
        <h2 className="text-base font-bold text-foreground">Active Alerts</h2>
        <div className="flex items-center gap-2">
          {incidents.length > 0 && (
            <Badge variant="danger" withDot>
              {incidents.length} Urgent
            </Badge>
          )}
          {alarmSounding && (
            <Button variant="danger" size="sm" onClick={onMuteAlarm} className="animate-pulse">
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
              Turn off alarm
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3 p-4" role="status" aria-label="Loading active alerts" aria-busy="true">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-[120px] rounded-md bg-border-subtle" />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          tone="success"
          title="No active emergencies"
          description="Every monitored worker is reporting normally."
          className="flex-1"
        />
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {incidents.map((incident) => (
            <li key={incident.id} className="rounded-md border border-danger-border bg-danger-tint p-3.5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-danger-soft">
                  <ShieldAlert className="h-[18px] w-[18px] text-danger" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-danger-soft-foreground">Emergency</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(incident.startedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <p className="truncate text-sm">
                    <span className="font-bold text-foreground">{incident.worker?.name ?? "Unknown worker"}</span>{" "}
                    <span className="font-medium text-muted-foreground">{incident.worker?.workerCode ?? "—"}</span>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs tabular-nums text-text-secondary">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {formatLocation(incident)}
                  </p>
                </div>
              </div>
              <Button
                variant="danger"
                className="mt-3 w-full"
                loading={resolvingId === incident.id}
                onClick={() => onResolve(incident, incident.worker)}
              >
                Resolve Incident
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
