import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, organizationScope, assertOrganizationAccess } from "@/lib/auth";
import { assert } from "@/lib/validation";
import { parsePagination, paginated } from "@/lib/pagination";
import { stripDeleted } from "@/lib/softDelete";

export const runtime = "nodejs";

export const GET = withRoute(async (request) => {
  const user = await getAuthUser(request);
  const params = request.nextUrl.searchParams;
  const page = parsePagination(params, ["startedAt", "resolvedAt", "createdAt"]);
  const status = params.get("status");
  const organizationId = params.get("organizationId");
  const workerId = params.get("workerId");
  const from = params.get("from");
  const to = params.get("to");
  const search = params.get("search")?.trim();

  assert(!from || !Number.isNaN(new Date(from).getTime()), "from must be a valid ISO date");
  assert(!to || !Number.isNaN(new Date(to).getTime()), "to must be a valid ISO date");
  if (organizationId) assertOrganizationAccess(user, organizationId);

  const where = {
    is_deleted: false,
    ...organizationScope(user),
    ...(organizationId ? { organizationId } : {}),
    ...(workerId ? { workerId } : {}),
    ...(search ? { worker: { OR: [{ name: { contains: search, mode: "insensitive" } }, { workerCode: { contains: search, mode: "insensitive" } }] } } : {}),
    ...(status === "ACTIVE" || status === "RESOLVED" ? { status } : {}),
    ...(from || to ? { startedAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lt: new Date(to) } : {}) } } : {}),
  };

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      include: {
        worker: true,
        workerNode: true,
        organization: { select: { name: true, is_deleted: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
      orderBy: params.get("sortBy") ? page.orderBy : { startedAt: "desc" },
      skip: page.skip,
      take: page.take,
    }),
    prisma.incident.count({ where }),
  ]);

  return ok(paginated(incidents.map((incident) => stripDeleted(incident, ["worker", "workerNode", "organization"])), total, page));
});
