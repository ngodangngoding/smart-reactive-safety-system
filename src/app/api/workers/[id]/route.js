import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole, assertOrganizationAccess } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";
import { NotFoundError } from "@/lib/errors";
import { WORKER_INCLUDE, serializeWorker } from "@/lib/serializers";
import { assert } from "@/lib/validation";
import { softDeleteWorkersTx, CASCADE_TX_OPTIONS } from "@/lib/cascade";

async function loadWorker(id) {
  const record = await prisma.worker.findFirst({ where: { id, is_deleted: false }, include: WORKER_INCLUDE });
  if (!record) throw new NotFoundError("Worker not found");
  return record;
}

export const GET = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  const { id } = await params;
  const worker = await loadWorker(id);
  assertOrganizationAccess(user, worker.organizationId);

  return ok(serializeWorker(worker));
});

export const PATCH = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN", "ADMIN"]);

  const { id } = await params;
  const before = await loadWorker(id);
  assertOrganizationAccess(user, before.organizationId);

  const body = await request.json();
  const data = {};
  if (typeof body?.name === "string") data.name = body.name.trim();
  if (typeof body?.workerCode === "string") {
    assert(body.workerCode.trim().length > 0, "workerCode is required");
    data.workerCode = body.workerCode.trim();
  }
  if (typeof body?.isActive === "boolean") data.isActive = body.isActive;

  const updated = await prisma.worker.update({ where: { id }, data, include: WORKER_INCLUDE });

  await writeAuditLog({
    organizationId: before.organizationId,
    performedByUserId: user.id,
    action: "UPDATE_WORKER",
    metadata: { target: { table: "Worker", id }, before: { name: before.name, isActive: before.isActive }, after: { name: updated.name, isActive: updated.isActive } },
  });

  return ok(serializeWorker(updated), "Worker updated successfully.", 200, "WORKER_UPDATED");
});

export const DELETE = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN", "ADMIN"]);

  const { id } = await params;
  const before = await loadWorker(id);
  assertOrganizationAccess(user, before.organizationId);

  const cascade = await prisma.$transaction(async (tx) => {
    const counts = await softDeleteWorkersTx(tx, { workerIds: [id] });
    await writeAuditLog(
      {
        organizationId: before.organizationId,
        performedByUserId: user.id,
        action: "SOFT_DELETE_WORKER",
        metadata: { target: { table: "Worker", id }, cascade: counts },
      },
      tx
    );
    return counts;
  }, CASCADE_TX_OPTIONS);

  return ok({ id, cascade }, "Worker deleted successfully.", 200, "WORKER_DELETED");
});
