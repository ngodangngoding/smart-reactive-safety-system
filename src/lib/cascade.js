import { writeAuditLog } from "@/lib/auditLog";
import { softDeleteData, scrambleUnique } from "@/lib/softDelete";


const NOT_DELETED = { is_deleted: false };

export const CASCADE_TX_OPTIONS = { timeout: 30000, maxWait: 10000 };

export async function softDeleteWorkerNodesTx(tx, { nodeIds }) {
  if (nodeIds.length === 0) return { workerNodes: 0, telemetry: 0, incidents: 0 };

  const telemetry = await tx.telemetry.updateMany({ where: { workerNodeId: { in: nodeIds }, ...NOT_DELETED }, data: { is_deleted: true } });
  const incidents = await tx.incident.updateMany({ where: { workerNodeId: { in: nodeIds }, ...NOT_DELETED }, data: softDeleteData() });

  const nodes = await tx.workerNode.findMany({ where: { id: { in: nodeIds }, ...NOT_DELETED }, select: { id: true, deviceWorkerId: true, workerId: true } });
  for (const node of nodes) {
    await tx.workerNode.update({
      where: { id: node.id },
      data: {
        archivedDeviceWorkerId: node.deviceWorkerId,
        archivedWorkerId: node.workerId,
        deviceWorkerId: null,
        workerId: null,
        isActive: false,
        ...softDeleteData(),
      },
    });
  }

  return { workerNodes: nodes.length, telemetry: telemetry.count, incidents: incidents.count };
}

export async function softDeleteWorkersTx(tx, { workerIds }) {
  const counts = { workers: 0, workerNodes: 0, telemetry: 0, incidents: 0 };
  if (workerIds.length === 0) return counts;

  const nodes = await tx.workerNode.findMany({ where: { workerId: { in: workerIds }, ...NOT_DELETED }, select: { id: true } });
  const nodeCounts = await softDeleteWorkerNodesTx(tx, { nodeIds: nodes.map((n) => n.id) });

  const incidents = await tx.incident.updateMany({ where: { workerId: { in: workerIds }, ...NOT_DELETED }, data: softDeleteData() });

  const workers = await tx.worker.findMany({ where: { id: { in: workerIds }, ...NOT_DELETED }, select: { id: true, workerCode: true } });
  for (const worker of workers) {
    await tx.worker.update({
      where: { id: worker.id },
      data: { workerCode: scrambleUnique(worker.workerCode), isActive: false, ...softDeleteData() },
    });
  }

  return { workers: workers.length, workerNodes: nodeCounts.workerNodes, telemetry: nodeCounts.telemetry, incidents: nodeCounts.incidents + incidents.count };
}

export async function softDeleteUsersTx(tx, { userIds }) {
  const users = await tx.user.findMany({ where: { id: { in: userIds }, ...NOT_DELETED }, select: { id: true, email: true } });
  for (const user of users) {
    await tx.user.update({
      where: { id: user.id },
      data: { email: scrambleUnique(user.email), isActive: false, tokenVersion: { increment: 1 }, ...softDeleteData() },
    });
  }
  return { count: users.length, users };
}

export async function softDeleteOrganizationTx(tx, { organizationId, actorUserId }) {
  const organization = await tx.organization.findFirst({ where: { id: organizationId, ...NOT_DELETED }, select: { id: true, licenseId: true } });
  if (!organization) return null;

  const [users, workers, nodes] = await Promise.all([
    tx.user.findMany({ where: { organizationId, ...NOT_DELETED }, select: { id: true } }),
    tx.worker.findMany({ where: { organizationId, ...NOT_DELETED }, select: { id: true } }),
    tx.workerNode.findMany({ where: { organizationId, ...NOT_DELETED }, select: { id: true } }),
  ]);

  const nodeCounts = await softDeleteWorkerNodesTx(tx, { nodeIds: nodes.map((n) => n.id) });
  const workerCounts = await softDeleteWorkersTx(tx, { workerIds: workers.map((w) => w.id) });
  const incidents = await tx.incident.updateMany({ where: { organizationId, ...NOT_DELETED }, data: softDeleteData() });
  const userResult = await softDeleteUsersTx(tx, { userIds: users.map((u) => u.id) });

  let license = "none";
  if (organization.licenseId) {
    const otherUsers = await tx.organization.count({ where: { licenseId: organization.licenseId, ...NOT_DELETED, id: { not: organizationId } } });
    if (otherUsers === 0) {
      await tx.license.update({ where: { id: organization.licenseId }, data: softDeleteData() });
      license = "deleted";
    } else {
      license = "kept";
    }
  }

  await tx.organization.update({ where: { id: organizationId }, data: { isActive: false, ...softDeleteData() } });

  const cascade = {
    users: userResult.count,
    workers: workerCounts.workers,
    workerNodes: nodeCounts.workerNodes,
    telemetry: nodeCounts.telemetry,
    incidents: nodeCounts.incidents + workerCounts.incidents + incidents.count,
    license,
  };

  await writeAuditLog(
    {
      organizationId,
      performedByUserId: actorUserId,
      action: "SOFT_DELETE_ORGANIZATION",
      metadata: { target: { table: "Organization", id: organizationId }, cascade },
    },
    tx
  );

  return { cascade, users: userResult.users };
}


export async function getWorkerNodeDeletePreview(client, nodeId) {
  const [telemetry, incidents] = await Promise.all([
    client.telemetry.count({ where: { workerNodeId: nodeId, ...NOT_DELETED } }),
    client.incident.count({ where: { workerNodeId: nodeId, ...NOT_DELETED } }),
  ]);
  return { workerNodes: 1, telemetry, incidents };
}

export async function getWorkerDeletePreview(client, workerId) {
  const node = await client.workerNode.findFirst({ where: { workerId, ...NOT_DELETED }, select: { id: true } });
  const nodePreview = node ? await getWorkerNodeDeletePreview(client, node.id) : { workerNodes: 0, telemetry: 0, incidents: 0 };
  const workerIncidents = await client.incident.count({ where: { workerId, ...NOT_DELETED, ...(node ? { workerNodeId: { not: node.id } } : {}) } });
  return { workers: 1, workerNodes: nodePreview.workerNodes, telemetry: nodePreview.telemetry, incidents: nodePreview.incidents + workerIncidents };
}

export async function getOrganizationDeletePreview(client, organizationId) {
  const organization = await client.organization.findFirst({ where: { id: organizationId, ...NOT_DELETED }, select: { licenseId: true, license: { select: { name: true } } } });
  const [users, workers, workerNodes, telemetry, incidents, otherUsers] = await Promise.all([
    client.user.count({ where: { organizationId, ...NOT_DELETED } }),
    client.worker.count({ where: { organizationId, ...NOT_DELETED } }),
    client.workerNode.count({ where: { organizationId, ...NOT_DELETED } }),
    client.telemetry.count({ where: { workerNode: { organizationId, ...NOT_DELETED }, ...NOT_DELETED } }),
    client.incident.count({ where: { organizationId, ...NOT_DELETED } }),
    organization?.licenseId ? client.organization.count({ where: { licenseId: organization.licenseId, ...NOT_DELETED, id: { not: organizationId } } }) : Promise.resolve(1),
  ]);
  return {
    users,
    workers,
    workerNodes,
    telemetry,
    incidents,
    licenseWillBeDeleted: Boolean(organization?.licenseId) && otherUsers === 0,
    licenseName: organization?.license?.name ?? null,
  };
}

export async function getLicenseDeletePreview(client, licenseId) {
  const organizationsUsing = await client.organization.findMany({ where: { licenseId, ...NOT_DELETED }, select: { id: true, name: true } });
  return { organizationsUsing, canDelete: organizationsUsing.length === 0 };
}
