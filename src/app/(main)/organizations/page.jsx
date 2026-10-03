"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import PageHeader from "@/components/organisms/PageHeader.jsx";
import OrganizationsTable from "@/components/organisms/OrganizationsTable.jsx";
import Pagination from "@/components/organisms/Pagination.jsx";
import TableSkeleton from "@/components/organisms/TableSkeleton.jsx";
import AccessDenied from "@/components/organisms/AccessDenied.jsx";
import ListCard, { CountLabel, ListError } from "@/components/organisms/ListCard.jsx";
import SearchInput from "@/components/atoms/SearchInput.jsx";
import DeleteConfirmationModal from "@/components/template/DeleteConfirmationModal.jsx";
import { useAuth } from "../AuthContext.js";
import { getOrganizations, deleteOrganization, getOrganizationDeletePreview } from "@/services/organizationService.js";
import { usePagedList } from "@/lib/usePagedList.js";
import { useDeletePreview, formatCascade } from "@/lib/useDeletePreview.js";
import { apiErrorMessage } from "@/lib/apiError.js";

export default function OrganizationsPage() {
  const { user } = useAuth();
  const isSuperadmin = user.role === "SUPERADMIN";
  const list = usePagedList(getOrganizations, { enabled: isSuperadmin, errorMessage: "Failed to load organizations" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { preview, loading: previewLoading } = useDeletePreview(deleteTarget?.id, getOrganizationDeletePreview);

  if (!isSuperadmin) {
    return <AccessDenied message="Organization management is available to Super Admins only." />;
  }

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      const { message } = await deleteOrganization(deleteTarget.id);
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
  const details = preview
    ? [cascade && `Will also be deleted: ${cascade}.`, preview.licenseWillBeDeleted && `License "${preview.licenseName}" will be deleted too.`].filter(Boolean).join(" ")
    : null;

  return (
    <div className="space-y-5">
      <PageHeader title="Organizations" description="Manage every Organization on the platform." addHref="/organizations/add" addLabel="New Organization" />

      <ListCard
        toolbar={
          <>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search organization name" label="Search organizations by name" />
            {list.pagination && <CountLabel shown={list.items.length} total={list.pagination.total} noun="organizations" />}
          </>
        }
      >
        {list.error ? (
          <ListError message={list.error} onRetry={list.reload} />
        ) : list.loading ? (
          <TableSkeleton columns={6} />
        ) : (
          <OrganizationsTable organizations={list.items} onDelete={setDeleteTarget} />
        )}
        <Pagination pagination={list.pagination} onPageChange={list.setPage} noun="organizations" />
      </ListCard>

      <DeleteConfirmationModal
        open={Boolean(deleteTarget)}
        title="Delete this organization?"
        description={`"${deleteTarget?.name}" will be soft-deleted together with its users, workers, devices, telemetry, and incidents.`}
        details={details}
        detailsLoading={previewLoading}
        requireText={deleteTarget?.name ?? null}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
