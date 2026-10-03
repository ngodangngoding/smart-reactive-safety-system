import { stripDeleted } from "@/lib/softDelete";

const LIVE = { is_deleted: false };

export const ORGANIZATION_INCLUDE = {
  license: { select: { id: true, name: true, maxDevice: true, is_deleted: true } },
  _count: {
    select: {
      users: { where: LIVE },
      workers: { where: LIVE },
      workerNodes: { where: LIVE },
      incidents: { where: { ...LIVE, status: "ACTIVE" } },
    },
  },
};

export function serializeOrganization(organization) {
  const { license } = stripDeleted(organization, ["license"]);
  const counts = organization._count;
  return {
    id: organization.id,
    name: organization.name,
    isActive: organization.isActive,
    license: license ? { id: license.id, name: license.name, maxDevice: license.maxDevice } : null,
    deviceUsage: { used: counts.workerNodes, max: license?.maxDevice ?? 0 },
    counts: { users: counts.users, workers: counts.workers, workerNodes: counts.workerNodes, activeIncidents: counts.incidents },
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  };
}

export function serializeUser(user) {
  const { organization } = stripDeleted(user, ["organization"]);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    googleLinkedAt: user.googleLinkedAt,
    organizationId: user.organizationId,
    organization: organization ? { id: organization.id, name: organization.name } : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const USER_INCLUDE = { organization: { select: { id: true, name: true, is_deleted: true } } };

export async function latestTelemetryByNode(client, nodeIds) {
  const rows = await Promise.all(
    nodeIds.map((workerNodeId) =>
      client.telemetry.findFirst({
        where: { workerNodeId, is_deleted: false },
        orderBy: { receivedAt: "desc" },
        select: { receivedAt: true, batteryPercent: true },
      })
    )
  );
  return Object.fromEntries(nodeIds.map((id, i) => [id, rows[i]]));
}

export async function serializeWorkerNodes(client, nodes) {
  const latest = await latestTelemetryByNode(client, nodes.map((n) => n.id));
  return nodes.map((node) => {
    const { worker, organization } = stripDeleted(node, ["worker", "organization"]);
    return {
      id: node.id,
      deviceWorkerId: node.deviceWorkerId,
      isActive: node.isActive,
      workerId: node.workerId,
      organizationId: node.organizationId,
      worker: worker ? { id: worker.id, name: worker.name, workerCode: worker.workerCode } : null,
      organization: organization ? { id: organization.id, name: organization.name } : null,
      lastTelemetryAt: latest[node.id]?.receivedAt ?? null,
      lastBatteryPercent: latest[node.id]?.batteryPercent ?? null,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    };
  });
}

export const WORKER_NODE_INCLUDE = {
  worker: { select: { id: true, name: true, workerCode: true, is_deleted: true } },
  organization: { select: { id: true, name: true, is_deleted: true } },
};

export const WORKER_INCLUDE = {
  workerNode: { select: { id: true, deviceWorkerId: true, isActive: true, is_deleted: true } },
  organization: { select: { id: true, name: true, is_deleted: true } },
  incidents: { where: { ...LIVE, status: "ACTIVE" }, select: { id: true }, take: 1 },
};

export function serializeWorker(worker) {
  const { workerNode, organization } = stripDeleted(worker, ["workerNode", "organization"]);
  return {
    id: worker.id,
    workerCode: worker.workerCode,
    name: worker.name,
    isActive: worker.isActive,
    organizationId: worker.organizationId,
    organization: organization ? { id: organization.id, name: organization.name } : null,
    workerNode: workerNode ? { id: workerNode.id, deviceWorkerId: workerNode.deviceWorkerId, isActive: workerNode.isActive } : null,
    hasActiveIncident: worker.incidents.length > 0,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt,
  };
}
