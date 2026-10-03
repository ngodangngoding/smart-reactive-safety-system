"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import PageHeader from "@/components/organisms/PageHeader.jsx";
import LicensesTable from "@/components/organisms/LicensesTable.jsx";
import Pagination from "@/components/organisms/Pagination.jsx";
import TableSkeleton from "@/components/organisms/TableSkeleton.jsx";
import AccessDenied from "@/components/organisms/AccessDenied.jsx";
import ListCard, { CountLabel, ListError } from "@/components/organisms/ListCard.jsx";
import SearchInput from "@/components/atoms/SearchInput.jsx";
import DeleteConfirmationModal from "@/components/template/DeleteConfirmationModal.jsx";
import { useAuth } from "../AuthContext.js";
import { getLicenses, deleteLicense, getLicenseDeletePreview } from "@/services/licenseService.js";
import { usePagedList } from "@/lib/usePagedList.js";
import { useDeletePreview } from "@/lib/useDeletePreview.js";
import { apiErrorMessage } from "@/lib/apiError.js";

export default function LicensesPage() {
  const { user } = useAuth();
  const isSuperadmin = user.role === "SUPERADMIN";
  const list = usePagedList(getLicenses, { enabled: isSuperadmin, errorMessage: "Failed to load licenses" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { preview, loading: previewLoading } = useDeletePreview(deleteTarget?.id, getLicenseDeletePreview);

  if (!isSuperadmin) {
    return <AccessDenied message="License management is available to Super Admins only." />;
  }

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      const { message } = await deleteLicense(deleteTarget.id);
      toast.success(message);
      setDeleteTarget(null);
      await list.reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const blockedBy = preview && !preview.canDelete ? preview.organizationsUsing.map((org) => org.name).join(", ") : null;

  return (
    <div className="space-y-5">
      <PageHeader title="Licenses" description="Set how many devices each Organization may register." addHref="/licenses/add" addLabel="New License" />

      <ListCard
        toolbar={
          <>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search license name" label="Search licenses by name" />
            {list.pagination && <CountLabel shown={list.items.length} total={list.pagination.total} noun="licenses" />}
          </>
        }
      >
        {list.error ? (
          <ListError message={list.error} onRetry={list.reload} />
        ) : list.loading ? (
          <TableSkeleton columns={4} />
        ) : (
          <LicensesTable licenses={list.items} onDelete={setDeleteTarget} />
        )}
        <Pagination pagination={list.pagination} onPageChange={list.setPage} noun="licenses" />
      </ListCard>

      <DeleteConfirmationModal
        open={Boolean(deleteTarget)}
        title="Delete this license?"
        description={`"${deleteTarget?.name}" will be soft-deleted. It can only be deleted when no organization uses it.`}
        details={blockedBy ? `Still used by: ${blockedBy}. Reassign them first.` : null}
        detailsLoading={previewLoading}
        requireText={deleteTarget?.name ?? null}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
