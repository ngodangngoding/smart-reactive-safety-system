import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole, organizationScope, assertOrganizationAccess } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";
import { assert } from "@/lib/validation";
import { assertOrganizationOperational } from "@/lib/license";
import { parsePagination, paginated } from "@/lib/pagination";
import { WORKER_INCLUDE, serializeWorker } from "@/lib/serializers";

export const runtime = "nodejs";

export const GET = withRoute(async (request) => {
  const user = await getAuthUser(request);
  const params = request.nextUrl.searchParams;
  const page = parsePagination(params, ["createdAt", "name", "workerCode"]);
  const search = params.get("search")?.trim();
  const organizationId = params.get("organizationId");
  const isActive = params.get("isActive");
  const hasNode = params.get("hasNode");

  if (organizationId) assertOrganizationAccess(user, organizationId);

  const where = {
    is_deleted: false,
    ...organizationScope(user),
    ...(organizationId ? { organizationId } : {}),
    ...(isActive === "true" || isActive === "false" ? { isActive: isActive === "true" } : {}),
    ...(hasNode === "true" ? { workerNode: { is: { is_deleted: false } } } : hasNode === "false" ? { workerNode: null } : {}),
    ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { workerCode: { contains: search, mode: "insensitive" } }] } : {}),
  };

  const [workers, total] = await Promise.all([
    prisma.worker.findMany({ where, include: WORKER_INCLUDE, orderBy: page.orderBy, skip: page.skip, take: page.take }),
    prisma.worker.count({ where }),
  ]);

  return ok(paginated(workers.map(serializeWorker), total, page));
});

export const POST = withRoute(async (request) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN", "ADMIN"]);

  const body = await request.json();
  assert(typeof body?.workerCode === "string" && body.workerCode.trim().length > 0, "workerCode is required");
  assert(typeof body?.name === "string" && body.name.trim().length > 0, "name is required");

  const organizationId = user.actingOrganizationId ?? (user.role === "SUPERADMIN" ? body?.organizationId : user.organizationId);
  assert(typeof organizationId === "string" && organizationId.length > 0, "organizationId is required");
  assertOrganizationAccess(user, organizationId);
  await assertOrganizationOperational(prisma, organizationId);

  const created = await prisma.worker.create({
    data: { organizationId, workerCode: body.workerCode.trim(), name: body.name.trim() },
    include: WORKER_INCLUDE,
  });

  await writeAuditLog({
    organizationId,
    performedByUserId: user.id,
    action: "CREATE_WORKER",
    metadata: { target: { table: "Worker", id: created.id } },
  });

  return ok(serializeWorker(created), "Worker created successfully.", 201, "WORKER_CREATED");
});
