"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Building2, Pencil, Trash2 } from "lucide-react";
import Badge from "@/components/atoms/Badge.jsx";
import IconButton from "@/components/atoms/IconButton.jsx";
import EmptyState from "@/components/atoms/EmptyState.jsx";
import { TABLE, TH, TH_ACTION, TD, TD_ACTION } from "@/components/organisms/tableStyles.js";

export default function OrganizationsTable({ organizations, onDelete }) {
  if (organizations.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No organizations found"
        description="Create one to start onboarding workers and admins."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className={TABLE}>
        <thead>
          <tr>
            <th scope="col" className={TH}>Name</th>
            <th scope="col" className={`${TH} hidden md:table-cell`}>License</th>
            <th scope="col" className={`${TH} hidden md:table-cell`}>Devices</th>
            <th scope="col" className={`${TH} hidden lg:table-cell`}>Users / Workers</th>
            <th scope="col" className={`${TH} hidden lg:table-cell`}>Active incidents</th>
            <th scope="col" className={TH}>Status</th>
            <th scope="col" className={`${TH} hidden sm:table-cell`}>Created</th>
            <th scope="col" className={TH_ACTION}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {organizations.map((org) => (
            <tr key={org.id}>
              <td className={TD}>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-neutral-soft text-text-secondary">
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <Link href={`/organizations/${org.id}`} className="text-sm font-semibold text-foreground hover:text-primary">
                    {org.name}
                  </Link>
                </div>
              </td>
              <td className={`${TD} hidden md:table-cell`}>{org.license?.name ?? "No license"}</td>
              <td className={`${TD} hidden tabular-nums md:table-cell`}>{org.deviceUsage.used}/{org.deviceUsage.max}</td>
              <td className={`${TD} hidden tabular-nums lg:table-cell`}>{org.counts.users} / {org.counts.workers}</td>
              <td className={`${TD} hidden tabular-nums lg:table-cell`}>{org.counts.activeIncidents}</td>
              <td className={TD}>
                <Badge variant={org.isActive ? "success" : "gray"}>{org.isActive ? "Active" : "Inactive"}</Badge>
              </td>
              <td className={`${TD} hidden tabular-nums sm:table-cell`}>{format(new Date(org.createdAt), "MMM d, yyyy")}</td>
              <td className={TD_ACTION}>
                <div className="flex items-center justify-end">
                  <IconButton icon={Pencil} href={`/organizations/${org.id}`} label={`Edit ${org.name}`} />
                  <IconButton icon={Trash2} danger label={`Delete ${org.name}`} onClick={() => onDelete(org)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
