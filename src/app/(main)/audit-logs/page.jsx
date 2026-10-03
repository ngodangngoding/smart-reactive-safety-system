"use client";

import { Fragment, useMemo, useState } from "react";
import { addDays, format, startOfDay } from "date-fns";
import { ChevronDown, ChevronRight, ScrollText } from "lucide-react";
import PageHeader from "@/components/organisms/PageHeader.jsx";
import ListCard, { CountLabel, ListError } from "@/components/organisms/ListCard.jsx";
import Pagination from "@/components/organisms/Pagination.jsx";
import TableSkeleton from "@/components/organisms/TableSkeleton.jsx";
import EmptyState from "@/components/atoms/EmptyState.jsx";
import IconButton from "@/components/atoms/IconButton.jsx";
import Badge from "@/components/atoms/Badge.jsx";
import AccessDenied from "@/components/organisms/AccessDenied.jsx";
import { TABLE, TH, TD } from "@/components/organisms/tableStyles.js";
import { getAuditLogs } from "@/services/auditLogService.js";
import { usePagedList } from "@/lib/usePagedList.js";
import { useOrgContext } from "@/lib/orgContext.js";

const ACTIONS = [
  "CREATE_USER", "UPDATE_USER", "SOFT_DELETE_USER",
  "CREATE_ORGANIZATION", "UPDATE_ORGANIZATION", "SOFT_DELETE_ORGANIZATION",
  "CREATE_LICENSE", "UPDATE_LICENSE", "SOFT_DELETE_LICENSE",
  "CREATE_WORKER", "UPDATE_WORKER", "SOFT_DELETE_WORKER",
  "REGISTER_WORKER_NODE", "UPDATE_WORKER_NODE", "SOFT_DELETE_WORKER_NODE",
  "CREATE_INCIDENT", "RESOLVE_INCIDENT", "SOFT_DELETE_INCIDENT",
  "SWITCH_ORGANIZATION", "CHANGE_PASSWORD", "RESET_PASSWORD",
];

const CONTROL =
  "h-9 rounded-sm border border-border-strong bg-card px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none";

const tone = (action) => (action.startsWith("SOFT_DELETE") ? "danger" : action.startsWith("CREATE") || action.startsWith("REGISTER") ? "success" : "gray");

export default function AuditLogsPage() {
  const { can, organizationId } = useOrgContext();
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState(null);

  const filters = useMemo(
    () => ({
      organizationId: organizationId || undefined,
      action: action || undefined,
      from: dateFrom ? startOfDay(new Date(`${dateFrom}T00:00:00`)).toISOString() : undefined,
      to: dateTo ? addDays(startOfDay(new Date(`${dateTo}T00:00:00`)), 1).toISOString() : undefined,
    }),
    [organizationId, action, dateFrom, dateTo]
  );
  const allowed = can("auditLog", "canRead");
  const list = usePagedList(getAuditLogs, { filters, enabled: allowed, pageSize: 25, errorMessage: "Failed to load audit logs" });

  if (!allowed) return <AccessDenied message="You do not have access to audit logs." />;

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Logs" description="Who did what, and when. Entries are kept even after the record is deleted." />

      <ListCard
        toolbar={
          <>
            <select aria-label="Filter by action" value={action} onChange={(e) => setAction(e.target.value)} className={CONTROL}>
              <option value="">All actions</option>
              {ACTIONS.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" aria-label="From date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className={CONTROL} />
              <input type="date" aria-label="To date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className={CONTROL} />
              {list.pagination && <CountLabel shown={list.items.length} total={list.pagination.total} noun="entries" />}
            </div>
          </>
        }
      >
        {list.error ? (
          <ListError message={list.error} onRetry={list.reload} />
        ) : list.loading ? (
          <TableSkeleton columns={5} />
        ) : list.items.length === 0 ? (
          <EmptyState icon={ScrollText} title="No audit entries" description="Nothing matches these filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className={TABLE}>
              <thead>
                <tr>
                  <th scope="col" className={TH}><span className="sr-only">Details</span></th>
                  <th scope="col" className={TH}>Time</th>
                  <th scope="col" className={TH}>Action</th>
                  <th scope="col" className={`${TH} hidden md:table-cell`}>Organization</th>
                  <th scope="col" className={`${TH} hidden sm:table-cell`}>Performed by</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((log) => {
                  const open = expanded === log.id;
                  return (
                    <Fragment key={log.id}>
                      <tr>
                        <td className={TD}>
                          <IconButton icon={open ? ChevronDown : ChevronRight} label={open ? "Hide details" : "Show details"} onClick={() => setExpanded(open ? null : log.id)} />
                        </td>
                        <td className={`${TD} whitespace-nowrap tabular-nums`}>{format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}</td>
                        <td className={TD}><Badge variant={tone(log.action)}>{log.action}</Badge></td>
                        <td className={`${TD} hidden md:table-cell`}>{log.organization?.name ?? <span className="text-text-disabled">-</span>}</td>
                        <td className={`${TD} hidden sm:table-cell`}>
                          {log.performedBy ? (
                            <div>
                              <p className="text-sm font-medium text-foreground">{log.performedBy.name}</p>
                              <p className="text-xs text-muted-foreground">{log.performedBy.email}</p>
                            </div>
                          ) : (
                            <span className="text-text-disabled">System / device</span>
                          )}
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={5} className="bg-surface-subtle px-6 py-3">
                            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs text-text-secondary">
                              {JSON.stringify(log.metadata, null, 2) ?? "No metadata"}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={list.pagination} onPageChange={list.setPage} noun="entries" />
      </ListCard>
    </div>
  );
}
