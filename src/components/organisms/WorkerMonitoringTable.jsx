"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { SearchX, TriangleAlert, Users, Wifi, WifiOff } from "lucide-react";
import Badge from "@/components/atoms/Badge.jsx";
import Button from "@/components/atoms/Button.jsx";
import Avatar from "@/components/atoms/Avatar.jsx";
import EmptyState from "@/components/atoms/EmptyState.jsx";
import SearchInput from "@/components/atoms/SearchInput.jsx";
import SegmentedFilter from "@/components/atoms/SegmentedFilter.jsx";
import WorkerTableSkeleton from "@/components/organisms/WorkerTableSkeleton.jsx";
import { TABLE, TH, TH_ACTION, TD, TD_ACTION } from "@/components/organisms/tableStyles.js";
import { deriveWorkerStatus, STATE_META } from "@/services/dashboardService.js";
import { LOW_BATTERY_PERCENT } from "@/lib/telemetryThresholds.js";

const FILTERS = [
  { value: "ALL", label: "All" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "LOW_BATTERY", label: "Low Battery" },
  { value: "OFFLINE", label: "Offline" },
];

function formatLocation(telemetry) {
  if (!telemetry || telemetry.latitude == null || telemetry.longitude == null) return null;
  return `${Number(telemetry.latitude).toFixed(5)}, ${Number(telemetry.longitude).toFixed(5)}`;
}

function BatteryBar({ percent }) {
  if (percent == null) return <span className="text-text-disabled">—</span>;
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <span className="inline-flex items-center gap-2 tabular-nums">
      <span className="h-1.5 w-9 overflow-hidden rounded-[3px] bg-border-subtle" aria-hidden="true">
        <span
          className={`block h-full ${value < LOW_BATTERY_PERCENT ? "bg-warning" : "bg-success"}`}
          style={{ width: `${value}%` }}
        />
      </span>
      {value}%
    </span>
  );
}

export default function WorkerMonitoringTable({ entries, loading, error, onRetry, showOrganization, onResolve, resolvingId, selectedId = null, onSelectWorker }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const all = useMemo(
    () => entries.map((entry) => ({ entry, status: deriveWorkerStatus({ ...entry, workerNode: entry.worker.workerNode }) })),
    [entries]
  );

  const counts = useMemo(() => {
    const result = { ALL: all.length, EMERGENCY: 0, LOW_BATTERY: 0, OFFLINE: 0 };
    for (const { status } of all) if (status.state in result) result[status.state] += 1;
    return result;
  }, [all]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all
      .filter(({ entry }) => !q || entry.worker.name.toLowerCase().includes(q) || entry.worker.workerCode.toLowerCase().includes(q))
      .filter(({ status }) => filter === "ALL" || status.state === filter);
  }, [all, search, filter]);

  const clearFilters = () => {
    setSearch("");
    setFilter("ALL");
  };

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card" aria-busy={loading || undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-3.5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-bold text-foreground">Worker Monitoring</h2>
          {!loading && !error && (
            <p className="text-xs tabular-nums text-muted-foreground">
              {rows.length} of {all.length} workers
            </p>
          )}
        </div>
        {!loading && !error && (
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name or worker code" label="Search workers by name or code" />
            <SegmentedFilter
              label="Filter by status"
              value={filter}
              onChange={setFilter}
              options={FILTERS.map((f) => ({ ...f, count: counts[f.value] }))}
            />
          </div>
        )}
      </div>

      {error ? (
        <EmptyState
          icon={TriangleAlert}
          tone="danger"
          title={error}
          action={
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          }
        />
      ) : loading ? (
        <WorkerTableSkeleton />
      ) : rows.length === 0 ? (
        all.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No workers registered yet"
            description="Register a Worker and assign a Worker Node to start monitoring."
          />
        ) : (
          <EmptyState
            icon={SearchX}
            title="No workers match"
            description="No workers match this search or filter."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        )
      ) : (
        <div className="overflow-x-auto">
          <table className={TABLE}>
            <thead>
              <tr>
                <th scope="col" className={TH}>Worker</th>
                <th scope="col" className={TH}>Status</th>
                <th scope="col" className={TH}>Connection</th>
                <th scope="col" className={`${TH} hidden sm:table-cell`}>Battery</th>
                <th scope="col" className={`${TH} hidden lg:table-cell`}>Location</th>
                {showOrganization && <th scope="col" className={`${TH} hidden xl:table-cell`}>Organization</th>}
                <th scope="col" className={TH}>Last Update</th>
                <th scope="col" className={TH_ACTION}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ entry, status }) => {
                const meta = STATE_META[status.state];
                const emergency = status.state === "EMERGENCY";
                const location = formatLocation(entry.latestTelemetry);
                const online = status.connection === "online";
                const selected = entry.worker.id === selectedId;
                return (
                  <tr
                    key={entry.worker.id}
                    aria-selected={selected || undefined}
                    onClick={() => onSelectWorker?.(entry.worker.id)}
                    className={`cursor-pointer ${selected ? "bg-primary-soft" : emergency ? "bg-danger-tint" : "hover:bg-surface-subtle"}`}
                  >
                    <td className={TD}>
                      <div className="flex items-center gap-3">
                        <Avatar name={entry.worker.name} danger={emergency} />
                        <div>
                          <Link
                            href={`/workers/${entry.worker.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className="text-sm font-semibold text-foreground hover:text-primary"
                          >
                            {entry.worker.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{entry.worker.workerCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className={TD}>
                      <Badge variant={meta.variant} withDot>{meta.label}</Badge>
                    </td>
                    <td className={TD}>
                      <span className={`inline-flex items-center gap-1.5 text-[13px] ${online ? "text-success-soft-foreground" : "text-muted-foreground"}`}>
                        {online ? <Wifi className="h-4 w-4" aria-hidden="true" /> : <WifiOff className="h-4 w-4" aria-hidden="true" />}
                        {online ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td className={`${TD} hidden sm:table-cell`}>
                      <BatteryBar percent={entry.latestTelemetry?.batteryPercent} />
                    </td>
                    <td className={`${TD} hidden tabular-nums lg:table-cell`}>
                      {location ?? <span className="text-text-disabled">Unavailable</span>}
                    </td>
                    {showOrganization && (
                      <td className={`${TD} hidden xl:table-cell`}>{entry.worker.organization?.name ?? "—"}</td>
                    )}
                    <td className={`${TD} tabular-nums`}>
                      {status.lastUpdateAt ? (
                        formatDistanceToNow(new Date(status.lastUpdateAt), { addSuffix: true })
                      ) : (
                        <span className="text-text-disabled">No data</span>
                      )}
                    </td>
                    <td className={TD_ACTION}>
                      {emergency && entry.activeIncident && (
                        <Button
                          variant="danger"
                          size="sm"
                          loading={resolvingId === entry.activeIncident.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            onResolve(entry.activeIncident, entry.worker);
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
