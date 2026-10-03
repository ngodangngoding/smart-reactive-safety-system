"use client";

import { Trash2, Users } from "lucide-react";
import Badge from "@/components/atoms/Badge.jsx";
import IconButton from "@/components/atoms/IconButton.jsx";
import EmptyState from "@/components/atoms/EmptyState.jsx";
import PersonCell from "@/components/organisms/PersonCell.jsx";
import { TABLE, TH, TH_ACTION, TD, TD_ACTION } from "@/components/organisms/tableStyles.js";

export default function WorkersTable({ workers, showOrganization, canDelete = true, onDelete }) {
  if (workers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No workers found"
        description="No workers match this search. Register a Worker to start monitoring them."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className={TABLE}>
        <thead>
          <tr>
            <th scope="col" className={TH}>Worker</th>
            <th scope="col" className={TH}>Device</th>
            <th scope="col" className={TH}>Status</th>
            {showOrganization && <th scope="col" className={`${TH} hidden lg:table-cell`}>Organization</th>}
            <th scope="col" className={TH_ACTION}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {workers.map((worker) => (
            <tr key={worker.id}>
              <td className={TD}>
                <PersonCell name={worker.name} sub={worker.workerCode} href={`/workers/${worker.id}`} />
              </td>
              <td className={TD}>
                {worker.workerNode ? (
                  <Badge variant="primary">Node #{worker.workerNode.deviceWorkerId}</Badge>
                ) : (
                  <Badge variant="gray">No Device</Badge>
                )}
              </td>
              <td className={TD}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={worker.isActive ? "success" : "gray"}>{worker.isActive ? "Active" : "Inactive"}</Badge>
                  {worker.hasActiveIncident && <Badge variant="danger" withDot>Emergency</Badge>}
                </div>
              </td>
              {showOrganization && <td className={`${TD} hidden lg:table-cell`}>{worker.organization?.name ?? "—"}</td>}
              <td className={TD_ACTION}>
                {canDelete && <IconButton icon={Trash2} danger label={`Delete ${worker.name}`} onClick={() => onDelete(worker)} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
