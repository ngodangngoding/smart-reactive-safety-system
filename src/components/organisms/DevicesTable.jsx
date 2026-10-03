"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Cpu, Trash2 } from "lucide-react";
import Badge from "@/components/atoms/Badge.jsx";
import IconButton from "@/components/atoms/IconButton.jsx";
import EmptyState from "@/components/atoms/EmptyState.jsx";
import { TABLE, TH, TH_ACTION, TD, TD_ACTION } from "@/components/organisms/tableStyles.js";

export default function DevicesTable({ workerNodes, showOrganization, canDelete = true, onDelete }) {
  if (workerNodes.length === 0) {
    return (
      <EmptyState
        icon={Cpu}
        title="No devices found"
        description="No Worker Nodes match this search. Register a device to connect it to a Worker."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className={TABLE}>
        <thead>
          <tr>
            <th scope="col" className={TH}>Device</th>
            <th scope="col" className={TH}>Assigned Worker</th>
            <th scope="col" className={`${TH} hidden md:table-cell`}>Last telemetry</th>
            <th scope="col" className={`${TH} hidden md:table-cell`}>Battery</th>
            <th scope="col" className={TH}>Status</th>
            {showOrganization && <th scope="col" className={`${TH} hidden lg:table-cell`}>Organization</th>}
            <th scope="col" className={TH_ACTION}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {workerNodes.map((node) => (
            <tr key={node.id}>
              <td className={TD}>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-accent-purple-soft text-accent-purple">
                    <Cpu className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <Link href={`/devices/${node.id}`} className="text-sm font-semibold text-foreground hover:text-primary">
                      Node #{node.deviceWorkerId}
                    </Link>
                    <p className="text-xs tabular-nums text-muted-foreground">worker_id {node.deviceWorkerId}</p>
                  </div>
                </div>
              </td>
              <td className={TD}>
                {node.worker ? (
                  <div>
                    <Link href={`/workers/${node.worker.id}`} className="text-sm font-semibold text-foreground hover:text-primary">
                      {node.worker.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{node.worker.workerCode}</p>
                  </div>
                ) : (
                  <span className="text-text-disabled">—</span>
                )}
              </td>
              <td className={`${TD} hidden tabular-nums md:table-cell`}>
                {node.lastTelemetryAt ? formatDistanceToNow(new Date(node.lastTelemetryAt), { addSuffix: true }) : <span className="text-text-disabled">No data</span>}
              </td>
              <td className={`${TD} hidden tabular-nums md:table-cell`}>
                {node.lastBatteryPercent != null ? `${Math.round(node.lastBatteryPercent)}%` : <span className="text-text-disabled">—</span>}
              </td>
              <td className={TD}>
                <Badge variant={node.isActive ? "success" : "gray"}>{node.isActive ? "Active" : "Inactive"}</Badge>
              </td>
              {showOrganization && <td className={`${TD} hidden lg:table-cell`}>{node.organization?.name ?? "—"}</td>}
              <td className={TD_ACTION}>
                {canDelete && <IconButton icon={Trash2} danger label={`Delete node ${node.deviceWorkerId}`} onClick={() => onDelete(node)} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
