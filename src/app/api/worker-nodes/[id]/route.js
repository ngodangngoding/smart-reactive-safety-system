import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole, assertOrganizationAccess } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { assert, isFiniteNumber } from "@/lib/validation";
import { WORKER_NODE_INCLUDE, serializeWorkerNodes } from "@/lib/serializers";
import { softDeleteWorkerNodesTx, CASCADE_TX_OPTIONS } from "@/lib/cascade";

async function loadWorkerNode(id) {
  const record = await prisma.workerNode.findFirst({ where: { id, is_deleted: false }, include: WORKER_NODE_INCLUDE });
  if (!record) throw new NotFoundError("WorkerNode not found");
  return record;
}

export const GET = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  const { id } = await params;
  const node = await loadWorkerNode(id);
  assertOrganizationAccess(user, node.organizationId);

  return ok((await serializeWorkerNodes(prisma, [node]))[0]);
});

export const PATCH = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN", "ADMIN"]);

  const { id } = await params;
  const before = await loadWorkerNode(id);
  assertOrganizationAccess(user, before.organizationId);

  const body = await request.json();
  const data = {};
  if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
  if (body?.deviceWorkerId !== undefined && body.deviceWorkerId !== before.deviceWorkerId) {
    assert(isFiniteNumber(body.deviceWorkerId), "deviceWorkerId must be a number");
    data.deviceWorkerId = body.deviceWorkerId;
  }

  if (typeof body?.workerId === "string" && body.workerId !== before.workerId) {
    const nextWorker = await prisma.worker.findFirst({ where: { id: body.workerId, is_deleted: false }, include: { workerNode: true } });
    if (!nextWorker) throw new NotFoundError("Worker not found");
    assertOrganizationAccess(user, nextWorker.organizationId);
    if (nextWorker.workerNode && !nextWorker.workerNode.is_deleted) throw new ValidationError("This Worker already has a WorkerNode assigned", "WORKER_ALREADY_HAS_NODE");
    data.workerId = nextWorker.id;
    data.organizationId = nextWorker.organizationId;
  }

  const updated = await prisma.workerNode.update({ where: { id }, data, include: WORKER_NODE_INCLUDE });

  await writeAuditLog({
    organizationId: before.organizationId,
    performedByUserId: user.id,
    action: "UPDATE_WORKER_NODE",
    metadata: { target: { table: "WorkerNode", id }, before: { isActive: before.isActive, workerId: before.workerId }, after: { isActive: updated.isActive, workerId: updated.workerId } },
  });

  return ok((await serializeWorkerNodes(prisma, [updated]))[0], "Worker node updated successfully.", 200, "WORKER_NODE_UPDATED");
});

export const DELETE = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN", "ADMIN"]);

  const { id } = await params;
  const before = await loadWorkerNode(id);
  assertOrganizationAccess(user, before.organizationId);

  const cascade = await prisma.$transaction(async (tx) => {
    const counts = await softDeleteWorkerNodesTx(tx, { nodeIds: [id] });
    await writeAuditLog(
      {
        organizationId: before.organizationId,
        performedByUserId: user.id,
        action: "SOFT_DELETE_WORKER_NODE",
        metadata: { target: { table: "WorkerNode", id }, cascade: counts },
      },
      tx
    );
    return counts;
  }, CASCADE_TX_OPTIONS);

  return ok({ id, cascade }, "Worker node deleted successfully.", 200, "WORKER_NODE_DELETED");
});
