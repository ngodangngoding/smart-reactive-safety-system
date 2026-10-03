"use client";

import { format, formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { ShieldCheck, Trash2 } from "lucide-react";
import IconButton from "@/components/atoms/IconButton.jsx";
import Badge from "@/components/atoms/Badge.jsx";
import Button from "@/components/atoms/Button.jsx";
import EmptyState from "@/components/atoms/EmptyState.jsx";
import PersonCell from "@/components/organisms/PersonCell.jsx";
import { TABLE, TH, TH_ACTION, TD, TD_ACTION } from "@/components/organisms/tableStyles.js";

function formatLocation(incident) {
  if (incident.latitude == null || incident.longitude == null) return null;
  return `${Number(incident.latitude).toFixed(5)}, ${Number(incident.longitude).toFixed(5)}`;
}

export default function IncidentsTable({ incidents, showOrganization, canDelete = false, onResolve, onDelete, resolvingId }) {
  const router = useRouter();

  if (incidents.length === 0) {
    return <EmptyState icon={ShieldCheck} title="No incidents found" description="No incidents match this filter." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className={TABLE}>
        <thead>
          <tr>
            <th scope="col" className={TH}>Worker</th>
            <th scope="col" className={TH}>Status</th>
            {showOrganization && <th scope="col" className={`${TH} hidden xl:table-cell`}>Organization</th>}
            <th scope="col" className={TH}>Started</th>
            <th scope="col" className={`${TH} hidden sm:table-cell`}>Resolved</th>
            <th scope="col" className={`${TH} hidden lg:table-cell`}>Resolved by</th>
            <th scope="col" className={`${TH} hidden lg:table-cell`}>Location</th>
            <th scope="col" className={TH_ACTION}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => {
            const active = incident.status === "ACTIVE";
            const location = formatLocation(incident);
            return (
              <tr
                key={incident.id}
                onClick={() => router.push(`/incidents/${incident.id}`)}
                className={`cursor-pointer ${active ? "bg-danger-tint" : "hover:bg-surface-subtle"}`}
              >
                <td className={TD}>
                  <PersonCell
                    name={incident.worker?.name ?? "Unknown worker"}
                    sub={incident.worker?.workerCode ?? "—"}
                    danger={active}
                  />
                </td>
                <td className={TD}>
                  <Badge variant={active ? "danger" : "success"} withDot>
                    {active ? "Emergency" : "Resolved"}
                  </Badge>
                </td>
                {showOrganization && <td className={`${TD} hidden xl:table-cell`}>{incident.organization?.name ?? "—"}</td>}
                <td className={`${TD} tabular-nums`}>{formatDistanceToNow(new Date(incident.startedAt), { addSuffix: true })}</td>
                <td className={`${TD} hidden tabular-nums sm:table-cell`}>
                  {incident.resolvedAt ? format(new Date(incident.resolvedAt), "MMM d, HH:mm") : <span className="text-text-disabled">—</span>}
                </td>
                <td className={`${TD} hidden lg:table-cell`}>{incident.resolvedBy?.name ?? <span className="text-text-disabled">—</span>}</td>
                <td className={`${TD} hidden tabular-nums lg:table-cell`}>
                  {location ?? <span className="text-text-disabled">Unavailable</span>}
                </td>
                <td className={TD_ACTION} onClick={(event) => event.stopPropagation()}>
                  {active && (
                    <Button variant="danger" size="sm" loading={resolvingId === incident.id} onClick={() => onResolve(incident)}>
                      Resolve
                    </Button>
                  )}
                  {canDelete && !active && <IconButton icon={Trash2} danger label="Delete incident" onClick={() => onDelete(incident)} />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
