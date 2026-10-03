"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ListCard, { CountLabel, ListError } from "@/components/organisms/ListCard.jsx";
import SearchInput from "@/components/atoms/SearchInput.jsx";
import SegmentedFilter from "@/components/atoms/SegmentedFilter.jsx";
import Badge from "@/components/atoms/Badge.jsx";
import PageHeader from "@/components/organisms/PageHeader.jsx";
import DevicesTable from "@/components/organisms/DevicesTable.jsx";
import Pagination from "@/components/organisms/Pagination.jsx";
import TableSkeleton from "@/components/organisms/TableSkeleton.jsx";
import DeleteConfirmationModal from "@/components/template/DeleteConfirmationModal.jsx";
import { useAuth } from "../AuthContext.js";
import { getWorkerNodes, deleteWorkerNode, getWorkerNodeDeletePreview } from "@/services/workerNodeService.js";
import { getCurrentUser } from "@/services/authService.js";
import { usePagedList } from "@/lib/usePagedList.js";
import { useDeletePreview, formatCascade } from "@/lib/useDeletePreview.js";
import { useOrgContext } from "@/lib/orgContext.js";
import { apiErrorMessage } from "@/lib/apiError.js";

const STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

export default function DevicesPage() {
  const { user } = useAuth();
  const { can } = useOrgContext();
  const showOrganization = user.role === "SUPERADMIN";

  const [isActive, setIsActive] = useState("ALL");
  const filters = useMemo(() => ({ isActive: isActive === "ALL" ? undefined : isActive }), [isActive]);
  const list = usePagedList(getWorkerNodes, { filters, errorMessage: "Failed to load worker nodes" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { preview, loading: previewLoading } = useDeletePreview(deleteTarget?.id, getWorkerNodeDeletePreview);

  const [usage, setUsage] = useState(null);
  const loadUsage = useCallback(async () => {
    try {
      const me = await getCurrentUser();
      setUsage(me.organization?.deviceUsage ?? null);
    } catch {
      setUsage(null);
    }
  }, []);
  useEffect(() => {
    const run = () => loadUsage();
    run();
  }, [loadUsage]);

  const quotaFull = usage !== null && usage.used >= usage.max;

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      const { message } = await deleteWorkerNode(deleteTarget.id);
      toast.success(message);
      setDeleteTarget(null);
      await Promise.all([list.reload(), loadUsage()]);
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
        title="Device Management"
        description="Register and manage physical Worker Nodes."
        addHref={can("workerNode", "canCreate") && !quotaFull ? "/devices/add" : undefined}
        addLabel="Register Device"
      >
        {usage && (
          <Badge variant={quotaFull ? "danger" : "gray"}>
            {usage.used}/{usage.max} devices{quotaFull ? " - license quota full" : ""}
          </Badge>
        )}
      </PageHeader>

      <ListCard
        toolbar={
          <>
            <SegmentedFilter label="Filter by status" value={isActive} onChange={setIsActive} options={STATUS_FILTERS} />
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search device ID" label="Search worker nodes by device ID" />
              {list.pagination && <CountLabel shown={list.items.length} total={list.pagination.total} noun="devices" />}
            </div>
          </>
        }
      >
        {list.error ? (
          <ListError message={list.error} onRetry={list.reload} />
        ) : list.loading ? (
          <TableSkeleton columns={showOrganization ? 6 : 5} />
        ) : (
          <DevicesTable
            workerNodes={list.items}
            showOrganization={showOrganization}
            canDelete={can("workerNode", "canDelete")}
            onDelete={setDeleteTarget}
          />
        )}
        <Pagination pagination={list.pagination} onPageChange={list.setPage} noun="devices" />
      </ListCard>

      <DeleteConfirmationModal
        open={Boolean(deleteTarget)}
        title="Delete this Worker Node?"
        description={`Node #${deleteTarget?.deviceWorkerId} will be soft-deleted and stop accepting telemetry. The worker stays and can get a new device.`}
        details={cascade ? `Will also be deleted: ${cascade}.` : null}
        detailsLoading={previewLoading}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
