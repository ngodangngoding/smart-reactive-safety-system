import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, organizationScope, assertOrganizationAccess } from "@/lib/auth";
import { loadMonitoringEntry } from "@/lib/monitoring";

export const runtime = "nodejs";

export const GET = withRoute(async (request) => {
  const user = await getAuthUser(request);
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (organizationId) assertOrganizationAccess(user, organizationId);

  const workers = await prisma.worker.findMany({
    where: { is_deleted: false, ...organizationScope(user), ...(organizationId ? { organizationId } : {}) },
    include: { workerNode: true, organization: { select: { name: true, is_deleted: true } } },
    orderBy: { name: "asc" },
  });

  return ok(await Promise.all(workers.map((worker) => loadMonitoringEntry(prisma, worker))));
});
