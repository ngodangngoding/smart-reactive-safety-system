"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import ListCard, { CountLabel, ListError } from "@/components/organisms/ListCard.jsx";
import SearchInput from "@/components/atoms/SearchInput.jsx";
import SegmentedFilter from "@/components/atoms/SegmentedFilter.jsx";
import PageHeader from "@/components/organisms/PageHeader.jsx";
import WorkersTable from "@/components/organisms/WorkersTable.jsx";
import Pagination from "@/components/organisms/Pagination.jsx";
import TableSkeleton from "@/components/organisms/TableSkeleton.jsx";
import DeleteConfirmationModal from "@/components/template/DeleteConfirmationModal.jsx";
import { useAuth } from "../AuthContext.js";
import { getWorkers, deleteWorker, getWorkerDeletePreview } from "@/services/workerService.js";
import { usePagedList } from "@/lib/usePagedList.js";
import { useDeletePreview, formatCascade } from "@/lib/useDeletePreview.js";
import { useOrgContext } from "@/lib/orgContext.js";
import { apiErrorMessage } from "@/lib/apiError.js";

const DEVICE_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "true", label: "With device" },
  { value: "false", label: "No device" },
];

export default function WorkersPage() {
  const { user } = useAuth();
  const { can } = useOrgContext();
  const showOrganization = user.role === "SUPERADMIN";

  const [hasNode, setHasNode] = useState("ALL");
  const filters = useMemo(() => ({ hasNode: hasNode === "ALL" ? undefined : hasNode }), [hasNode]);
  const list = usePagedList(getWorkers, { filters, errorMessage: "Failed to load workers" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { preview, loading: previewLoading } = useDeletePreview(deleteTarget?.id, getWorkerDeletePreview);

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      const { message } = await deleteWorker(deleteTarget.id);
      toast.success(message);
      setDeleteTarget(null);
      await list.reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const cascade = formatCascade(preview);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Workers"
        description="Register and manage field Workers."
        addHref={can("worker", "canCreate") ? "/workers/add" : undefined}
        addLabel="New Worker"
      />

      <ListCard
        toolbar={
          <>
            <SegmentedFilter label="Filter by device" value={hasNode} onChange={setHasNode} options={DEVICE_FILTERS} />
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search name or worker code" label="Search workers by name or code" />
              {list.pagination && <CountLabel shown={list.items.length} total={list.pagination.total} noun="workers" />}
            </div>
          </>
        }
      >
        {list.error ? (
          <ListError message={list.error} onRetry={list.reload} />
        ) : list.loading ? (
          <TableSkeleton columns={showOrganization ? 5 : 4} />
        ) : (
          <WorkersTable
            workers={list.items}
            showOrganization={showOrganization}
            canDelete={can("worker", "canDelete")}
            onDelete={setDeleteTarget}
          />
        )}
        <Pagination pagination={list.pagination} onPageChange={list.setPage} noun="workers" />
      </ListCard>

      <DeleteConfirmationModal
        open={Boolean(deleteTarget)}
        title="Delete this worker?"
        description={`"${deleteTarget?.name}" will be soft-deleted together with their device, telemetry, and incidents.`}
        details={cascade ? `Will also be deleted: ${cascade}.` : null}
        detailsLoading={previewLoading}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
