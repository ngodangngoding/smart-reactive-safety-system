import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole, organizationScope, assertOrganizationAccess } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";
import { assert, isFiniteNumber } from "@/lib/validation";
import { assertOrganizationOperational, assertDeviceQuota } from "@/lib/license";
import { parsePagination, paginated } from "@/lib/pagination";
import { WORKER_NODE_INCLUDE, serializeWorkerNodes } from "@/lib/serializers";
import { NotFoundError, ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

export const GET = withRoute(async (request) => {
  const user = await getAuthUser(request);
  const params = request.nextUrl.searchParams;
  const page = parsePagination(params, ["createdAt", "deviceWorkerId"]);
  const workerId = params.get("workerId");
  const organizationId = params.get("organizationId");
  const isActive = params.get("isActive");
  const search = params.get("search")?.trim();

  if (organizationId) assertOrganizationAccess(user, organizationId);

  const where = {
    is_deleted: false,
    ...organizationScope(user),
    ...(organizationId ? { organizationId } : {}),
    ...(workerId ? { workerId } : {}),
    ...(isActive === "true" || isActive === "false" ? { isActive: isActive === "true" } : {}),
    ...(search && Number.isFinite(Number(search)) ? { deviceWorkerId: Number(search) } : {}),
  };

  const [nodes, total] = await Promise.all([
    prisma.workerNode.findMany({ where, include: WORKER_NODE_INCLUDE, orderBy: page.orderBy, skip: page.skip, take: page.take }),
    prisma.workerNode.count({ where }),
  ]);

  return ok(paginated(await serializeWorkerNodes(prisma, nodes), total, page));
});

export const POST = withRoute(async (request) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN", "ADMIN"]);

  const body = await request.json();
  assert(isFiniteNumber(body?.deviceWorkerId), "deviceWorkerId must be a number");
  assert(typeof body?.workerId === "string" && body.workerId.length > 0, "workerId is required");

  // Quota check and create share one transaction so concurrent registrations cannot both squeeze under the limit.
  const { created, worker } = await prisma.$transaction(async (tx) => {
    const worker = await tx.worker.findFirst({ where: { id: body.workerId, is_deleted: false }, include: { workerNode: true } });
    if (!worker) throw new NotFoundError("Worker not found");
    assertOrganizationAccess(user, worker.organizationId);
    if (worker.workerNode && !worker.workerNode.is_deleted) throw new ValidationError("This Worker already has a WorkerNode assigned", "WORKER_ALREADY_HAS_NODE");

    await assertOrganizationOperational(tx, worker.organizationId);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${worker.organizationId}))`;
    await assertDeviceQuota(tx, worker.organizationId);

    const created = await tx.workerNode.create({
      data: { organizationId: worker.organizationId, workerId: worker.id, deviceWorkerId: body.deviceWorkerId },
      include: WORKER_NODE_INCLUDE,
    });
    return { created, worker };
  });

  await writeAuditLog({
    organizationId: worker.organizationId,
    performedByUserId: user.id,
    action: "REGISTER_WORKER_NODE",
    metadata: { target: { table: "WorkerNode", id: created.id } },
  });

  return ok((await serializeWorkerNodes(prisma, [created]))[0], "Worker node registered successfully.", 201, "WORKER_NODE_CREATED");
});
