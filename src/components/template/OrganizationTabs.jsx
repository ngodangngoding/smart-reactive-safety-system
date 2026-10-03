"use client";

import { useState } from "react";
import Link from "next/link";
import Badge from "@/components/atoms/Badge.jsx";
import SegmentedFilter from "@/components/atoms/SegmentedFilter.jsx";
import EmptyState from "@/components/atoms/EmptyState.jsx";
import TableSkeleton from "@/components/organisms/TableSkeleton.jsx";
import { ListError } from "@/components/organisms/ListCard.jsx";
import { TABLE, TH, TD } from "@/components/organisms/tableStyles.js";
import { getUsers } from "@/services/userService.js";
import { getWorkers } from "@/services/workerService.js";
import { getWorkerNodes } from "@/services/workerNodeService.js";
import { usePagedList } from "@/lib/usePagedList.js";

const TABS = {
  users: {
    fetcher: getUsers,
    empty: "No admins in this organization",
    columns: ["Name", "Email", "Status"],
    row: (user) => [<Link key="n" href={`/users/${user.id}`} className="font-semibold text-foreground hover:text-primary">{user.name}</Link>, user.email, <Badge key="s" variant={user.isActive ? "success" : "gray"}>{user.isActive ? "Active" : "Inactive"}</Badge>],
  },
  workers: {
    fetcher: getWorkers,
    empty: "No workers in this organization",
    columns: ["Worker", "Code", "Device"],
    row: (worker) => [<Link key="n" href={`/workers/${worker.id}`} className="font-semibold text-foreground hover:text-primary">{worker.name}</Link>, worker.workerCode, worker.workerNode ? `Node #${worker.workerNode.deviceWorkerId}` : "No device"],
  },
  devices: {
    fetcher: getWorkerNodes,
    empty: "No devices in this organization",
    columns: ["Device", "Worker", "Status"],
    row: (node) => [<Link key="n" href={`/devices/${node.id}`} className="font-semibold text-foreground hover:text-primary">Node #{node.deviceWorkerId}</Link>, node.worker?.name ?? "-", <Badge key="s" variant={node.isActive ? "success" : "gray"}>{node.isActive ? "Active" : "Inactive"}</Badge>],
  },
};

const OPTIONS = [
  { value: "users", label: "Users" },
  { value: "workers", label: "Workers" },
  { value: "devices", label: "Devices" },
];

function TabBody({ tab, organizationId }) {
  const config = TABS[tab];
  const list = usePagedList(config.fetcher, { filters: { organizationId }, pageSize: 10, errorMessage: "Failed to load data" });

  if (list.error) return <ListError message={list.error} onRetry={list.reload} />;
  if (list.loading) return <TableSkeleton columns={3} />;
  if (list.items.length === 0) return <EmptyState title={config.empty} />;

  return (
    <div className="overflow-x-auto">
      <table className={TABLE}>
        <thead>
          <tr>
            {config.columns.map((name) => (
              <th key={name} scope="col" className={TH}>{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.items.map((item) => (
            <tr key={item.id}>
              {config.row(item).map((cell, index) => (
                <td key={index} className={TD}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {list.pagination && list.pagination.total > list.items.length && (
        <p className="px-5 py-3 text-xs text-muted-foreground">
          Showing {list.items.length} of {list.pagination.total}.
        </p>
      )}
    </div>
  );
}

export default function OrganizationTabs({ organizationId }) {
  const [tab, setTab] = useState("users");

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border-subtle px-5 py-3.5">
        <SegmentedFilter label="Organization data" value={tab} onChange={setTab} options={OPTIONS} />
      </div>
      <TabBody key={tab} tab={tab} organizationId={organizationId} />
    </section>
  );
}
