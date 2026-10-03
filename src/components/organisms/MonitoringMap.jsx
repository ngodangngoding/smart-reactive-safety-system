"use client";

import { useMemo } from "react";
import { MapPinOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Badge from "@/components/atoms/Badge.jsx";
import DashboardMap from "./DashboardMap.jsx";
import { deriveWorkerStatus, STATE_META } from "@/services/dashboardService.js";
import { toMonitoringMarkers } from "@/lib/mapData.js";

function markerPopup(entry, status) {
  const meta = STATE_META[status.state];
  return (
    <div className="min-w-[180px] space-y-1.5">
      <div>
        <p className="text-sm font-semibold text-foreground">{entry.worker.name}</p>
        <p className="text-xs text-muted-foreground">{entry.worker.workerCode}</p>
      </div>
      <Badge variant={meta.variant} withDot>
        {meta.label}
      </Badge>
      <dl className="space-y-1 border-t border-border-subtle pt-1.5 text-xs">
        {entry.latestTelemetry && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Battery</dt>
            <dd className="font-medium text-foreground">{Math.round(entry.latestTelemetry.batteryPercent)}%</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Last Update</dt>
          <dd className="font-medium text-foreground">
            {status.lastUpdateAt ? formatDistanceToNow(new Date(status.lastUpdateAt), { addSuffix: true }) : "-"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

const LEGEND = [
  { label: "Normal", color: "var(--success)" },
  { label: "Low Battery", color: "var(--warning)" },
  { label: "Emergency", color: "var(--danger)" },
  { label: "Offline", color: "var(--neutral)" },
];

export default function MonitoringMap({ entries, selectedId = null, onSelectWorker }) {
  const markers = useMemo(
    () => toMonitoringMarkers(
      entries,
      (entry) => deriveWorkerStatus({ ...entry, workerNode: entry.worker.workerNode }).state,
      (entry) => markerPopup(entry, deriveWorkerStatus({ ...entry, workerNode: entry.worker.workerNode }))
    ),
    [entries]
  );
  const selected = useMemo(() => markers.find((m) => m.id === selectedId) ?? null, [markers, selectedId]);

  return (
    <section className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border-subtle px-4 py-2 sm:px-5">
        <h2 className="text-base font-bold text-foreground">Live Map</h2>
        <ul className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
          {LEGEND.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative min-h-0 flex-1">
        <DashboardMap markers={markers} selected={selected} onSelectMarker={(m) => onSelectWorker?.(m.id)} />
        {markers.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center px-4">
            <p className="flex items-center gap-2 rounded-sm border border-border bg-card/95 px-3 py-2 text-xs text-text-secondary shadow-segment">
              <MapPinOff className="h-4 w-4" aria-hidden="true" />
              No location data yet. Workers appear once their Worker Node reports GPS telemetry.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
