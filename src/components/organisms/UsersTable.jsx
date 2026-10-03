"use client";

import { Pencil, Trash2, UserCog } from "lucide-react";
import Badge from "@/components/atoms/Badge.jsx";
import IconButton from "@/components/atoms/IconButton.jsx";
import EmptyState from "@/components/atoms/EmptyState.jsx";
import PersonCell from "@/components/organisms/PersonCell.jsx";
import { TABLE, TH, TH_ACTION, TD, TD_ACTION } from "@/components/organisms/tableStyles.js";

export default function UsersTable({ users, currentUserId, blockedReason = () => null, onDelete }) {
  if (users.length === 0) {
    return <EmptyState icon={UserCog} title="No accounts found" description="No accounts match this search." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className={TABLE}>
        <thead>
          <tr>
            <th scope="col" className={TH}>Name</th>
            <th scope="col" className={`${TH} hidden sm:table-cell`}>Role</th>
            <th scope="col" className={`${TH} hidden lg:table-cell`}>Organization</th>
            <th scope="col" className={TH}>Status</th>
            <th scope="col" className={TH_ACTION}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((account) => {
            const isSelf = account.id === currentUserId;
            const reason = blockedReason(account);
            return (
              <tr key={account.id}>
                <td className={TD}>
                  <PersonCell
                    name={account.name}
                    photoUrl={account.avatarUrl}
                    sub={account.email}
                    href={`/users/${account.id}`}
                    suffix={isSelf ? <span className="font-normal text-muted-foreground"> (you)</span> : null}
                  />
                </td>
                <td className={`${TD} hidden sm:table-cell`}>
                  <Badge variant={account.role === "SUPERADMIN" ? "primary" : "gray"}>{account.role}</Badge>
                </td>
                <td className={`${TD} hidden lg:table-cell`}>
                  {account.organization?.name ?? <span className="text-text-disabled">All organizations</span>}
                </td>
                <td className={TD}>
                  <Badge variant={account.isActive ? "success" : "gray"}>{account.isActive ? "Active" : "Inactive"}</Badge>
                </td>
                <td className={TD_ACTION}>
                  <div className="flex items-center justify-end">
                    <IconButton icon={Pencil} href={`/users/${account.id}`} label={`Edit ${account.name}`} />
                    <IconButton
                      icon={Trash2}
                      danger
                      label={reason ?? `Delete ${account.name}`}
                      onClick={() => onDelete(account)}
                      disabled={Boolean(reason)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
