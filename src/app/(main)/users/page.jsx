"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import PageHeader from "@/components/organisms/PageHeader.jsx";
import UsersTable from "@/components/organisms/UsersTable.jsx";
import Pagination from "@/components/organisms/Pagination.jsx";
import TableSkeleton from "@/components/organisms/TableSkeleton.jsx";
import AccessDenied from "@/components/organisms/AccessDenied.jsx";
import ListCard, { CountLabel, ListError } from "@/components/organisms/ListCard.jsx";
import SearchInput from "@/components/atoms/SearchInput.jsx";
import SegmentedFilter from "@/components/atoms/SegmentedFilter.jsx";
import DeleteConfirmationModal from "@/components/template/DeleteConfirmationModal.jsx";
import { useAuth } from "../AuthContext.js";
import { getUsers, deleteUser } from "@/services/userService.js";
import { usePagedList } from "@/lib/usePagedList.js";
import { apiErrorMessage } from "@/lib/apiError.js";
import { useSuperAdminTotal, deleteBlockedReason } from "@/lib/userDelete.js";

const ROLES = [
  { value: "ALL", label: "All roles" },
  { value: "SUPERADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
];

export default function UsersPage() {
  const { user } = useAuth();
  const isSuperadmin = user.role === "SUPERADMIN";
  const [role, setRole] = useState("ALL");
  const filters = useMemo(() => ({ role: role === "ALL" ? undefined : role }), [role]);
  const list = usePagedList(getUsers, { filters, enabled: isSuperadmin, errorMessage: "Failed to load users" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const superAdminTotal = useSuperAdminTotal(isSuperadmin, list.pagination?.total);
  const [deleting, setDeleting] = useState(false);

  if (!isSuperadmin) {
    return <AccessDenied message="User management is available to Super Admins only." />;
  }

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      const { message } = await deleteUser(deleteTarget.id);
      toast.success(message);
      setDeleteTarget(null);
      await list.reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="User Management" description="Manage SUPERADMIN and ADMIN accounts." addHref="/users/add" addLabel="New User" />

      <ListCard
        toolbar={
          <>
            <SegmentedFilter label="Filter by role" value={role} onChange={setRole} options={ROLES} />
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search name or email" label="Search users by name or email" />
              {list.pagination && <CountLabel shown={list.items.length} total={list.pagination.total} noun="users" />}
            </div>
          </>
        }
      >
        {list.error ? (
          <ListError message={list.error} onRetry={list.reload} />
        ) : list.loading ? (
          <TableSkeleton columns={4} />
        ) : (
          <UsersTable
            users={list.items}
            currentUserId={user.id}
            blockedReason={(account) => deleteBlockedReason(account, user.id, superAdminTotal)}
            onDelete={setDeleteTarget}
          />
        )}
        <Pagination pagination={list.pagination} onPageChange={list.setPage} noun="users" />
      </ListCard>

      <DeleteConfirmationModal
        open={Boolean(deleteTarget)}
        title="Delete this user?"
        description={`"${deleteTarget?.name}" will be soft-deleted and immediately lose access. Their email can be registered again.`}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
