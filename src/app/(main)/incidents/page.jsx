"use client";

import { useMemo, useState } from "react";
import { addDays, startOfDay } from "date-fns";
import toast from "react-hot-toast";
import PageHeader from "@/components/organisms/PageHeader.jsx";
import ListCard, { CountLabel, ListError } from "@/components/organisms/ListCard.jsx";
import SearchInput from "@/components/atoms/SearchInput.jsx";
import SegmentedFilter from "@/components/atoms/SegmentedFilter.jsx";
import IncidentsTable from "@/components/organisms/IncidentsTable.jsx";
import Pagination from "@/components/organisms/Pagination.jsx";
import TableSkeleton from "@/components/organisms/TableSkeleton.jsx";
import ResolveIncidentModal from "@/components/template/ResolveIncidentModal.jsx";
import DeleteConfirmationModal from "@/components/template/DeleteConfirmationModal.jsx";
import { useAuth } from "../AuthContext.js";
import { getIncidents, resolveIncident, deleteIncident } from "@/services/incidentService.js";
import { usePagedList } from "@/lib/usePagedList.js";
import { apiErrorMessage } from "@/lib/apiError.js";
import { useOrgContext } from "@/lib/orgContext.js";

const FILTERS = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "RESOLVED", label: "Resolved" },
];

const DATE_INPUT =
  "h-9 rounded-sm border border-border-strong bg-card px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none";

export default function IncidentsPage() {
  const { user } = useAuth();
  const { organizationId } = useOrgContext();
  const isSuperadmin = user.role === "SUPERADMIN" && !organizationId;

  const [status, setStatus] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filters = useMemo(
    () => ({
      organizationId: organizationId || undefined,
      status: status === "ALL" ? undefined : status,
      from: dateFrom ? startOfDay(new Date(`${dateFrom}T00:00:00`)).toISOString() : undefined,
      to: dateTo ? addDays(startOfDay(new Date(`${dateTo}T00:00:00`)), 1).toISOString() : undefined,
    }),
    [organizationId, status, dateFrom, dateTo]
  );
  const list = usePagedList(getIncidents, { filters, errorMessage: "Failed to load incidents" });

  const handleConfirmResolve = async (note) => {
    setResolvingId(resolveTarget.id);
    try {
      const { message } = await resolveIncident(resolveTarget.id, note);
      toast.success(message);
      setResolveTarget(null);
      await list.reload();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setResolvingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      const { message } = await deleteIncident(deleteTarget.id);
      toast.success(message);
      setDeleteTarget(null);
      await list.reload();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Incident History" description="Every emergency raised across monitored Worker Nodes." />

      <ListCard
        toolbar={
          <>
            <SegmentedFilter label="Filter by status" value={status} onChange={setStatus} options={FILTERS} />
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
                <input type="date" aria-label="From date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className={`${DATE_INPUT} w-full sm:w-auto`} />
                <input type="date" aria-label="To date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className={`${DATE_INPUT} w-full sm:w-auto`} />
              </div>
              <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search worker name or code" label="Search incidents by worker name or code" />
              {list.pagination && <CountLabel shown={list.items.length} total={list.pagination.total} noun="incidents" />}
            </div>
          </>
        }
      >
        {list.error ? (
          <ListError message={list.error} onRetry={list.reload} />
        ) : list.loading ? (
          <TableSkeleton columns={isSuperadmin ? 6 : 5} />
        ) : (
          <IncidentsTable
            incidents={list.items}
            showOrganization={isSuperadmin}
            canDelete={isSuperadmin}
            onResolve={setResolveTarget}
            onDelete={setDeleteTarget}
            resolvingId={resolvingId}
          />
        )}
        <Pagination pagination={list.pagination} onPageChange={list.setPage} noun="incidents" />
      </ListCard>

      {resolveTarget && (
        <ResolveIncidentModal
          incident={resolveTarget}
          worker={resolveTarget.worker}
          loading={resolvingId === resolveTarget.id}
          onConfirm={handleConfirmResolve}
          onClose={() => setResolveTarget(null)}
        />
      )}

      <DeleteConfirmationModal
        open={Boolean(deleteTarget)}
        title="Delete this incident?"
        description="The resolved incident is removed from history. Its telemetry stays untouched."
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
