"use client";

import Link from "next/link";
import { KeyRound, Pencil, Trash2 } from "lucide-react";
import IconButton from "@/components/atoms/IconButton.jsx";
import { format } from "date-fns";
import EmptyState from "@/components/atoms/EmptyState.jsx";
import Badge from "@/components/atoms/Badge.jsx";
import { TABLE, TH, TH_ACTION, TD, TD_ACTION } from "@/components/organisms/tableStyles.js";

const STATUS = {
  active: { label: "Active", variant: "success" },
  not_started: { label: "Not started", variant: "gray" },
  expired: { label: "Expired", variant: "danger" },
};

const formatDay = (dateOnly) => format(new Date(`${dateOnly}T00:00:00`), "MMM d, yyyy");

export default function LicensesTable({ licenses, onDelete }) {
  if (licenses.length === 0) {
    return (
      <EmptyState
        icon={KeyRound}
        title="No licenses found"
        description="Create a license to set how many workers and devices an organization may register."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className={TABLE}>
        <thead>
          <tr>
            <th scope="col" className={TH}>Name</th>
            <th scope="col" className={`${TH} hidden md:table-cell`}>Max Devices</th>
            <th scope="col" className={`${TH} hidden md:table-cell`}>Organizations</th>
            <th scope="col" className={`${TH} hidden md:table-cell`}>Start</th>
            <th scope="col" className={`${TH} hidden md:table-cell`}>End</th>
            <th scope="col" className={TH}>Status</th>
            <th scope="col" className={`${TH} hidden sm:table-cell`}>Created</th>
            <th scope="col" className={TH_ACTION}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {licenses.map((license) => (
            <tr key={license.id}>
              <td className={TD}>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-neutral-soft text-text-secondary">
                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <Link href={`/licenses/${license.id}`} className="text-sm font-semibold text-foreground hover:text-primary">
                    {license.name}
                  </Link>
                </div>
              </td>
              <td className={`${TD} hidden tabular-nums md:table-cell`}>{license.maxDevice}</td>
              <td className={`${TD} hidden tabular-nums md:table-cell`}>{license.organizations.length}</td>
              <td className={`${TD} hidden tabular-nums md:table-cell`}>{formatDay(license.startDate)}</td>
              <td className={`${TD} hidden tabular-nums md:table-cell`}>{formatDay(license.endDate)}</td>
              <td className={TD}>
                <Badge variant={STATUS[license.status].variant}>{STATUS[license.status].label}</Badge>
              </td>
              <td className={`${TD} hidden tabular-nums sm:table-cell`}>{format(new Date(license.createdAt), "MMM d, yyyy")}</td>
              <td className={TD_ACTION}>
                <div className="flex items-center justify-end">
                  <IconButton icon={Pencil} href={`/licenses/${license.id}`} label={`Edit ${license.name}`} />
                  <IconButton icon={Trash2} danger label={`Delete ${license.name}`} onClick={() => onDelete(license)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
