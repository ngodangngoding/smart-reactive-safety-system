import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, organizationScope, assertOrganizationAccess } from "@/lib/auth";
import { assert } from "@/lib/validation";
import { parsePagination, paginated } from "@/lib/pagination";

export const runtime = "nodejs";

export const GET = withRoute(async (request) => {
  const user = await getAuthUser(request);
  const params = request.nextUrl.searchParams;
  const page = parsePagination(params, ["createdAt", "action"]);
  const action = params.get("action");
  const organizationId = params.get("organizationId");
  const performedByUserId = params.get("performedByUserId");
  const from = params.get("from");
  const to = params.get("to");

  assert(!from || !Number.isNaN(new Date(from).getTime()), "from must be a valid ISO date");
  assert(!to || !Number.isNaN(new Date(to).getTime()), "to must be a valid ISO date");
  if (organizationId) assertOrganizationAccess(user, organizationId);

  const where = {
    is_deleted: false,
    ...organizationScope(user),
    ...(organizationId ? { organizationId } : {}),
    ...(performedByUserId ? { performedByUserId } : {}),
    ...(action ? { action } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lt: new Date(to) } : {}) } } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true, is_deleted: true } },
        performedBy: { select: { id: true, name: true, email: true, is_deleted: true } },
      },
      orderBy: page.orderBy,
      skip: page.skip,
      take: page.take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const items = logs.map((log) => ({
    id: log.id,
    action: log.action,
    organization: log.organization ? { id: log.organization.id, name: log.organization.name } : null,
    performedBy: log.performedBy ? { id: log.performedBy.id, name: log.performedBy.name, email: log.performedBy.email } : null,
    metadata: log.metadata,
    createdAt: log.createdAt,
  }));

  return ok(paginated(items, total, page));
});
