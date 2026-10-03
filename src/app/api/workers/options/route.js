import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, organizationScope, assertOrganizationAccess } from "@/lib/auth";

export const runtime = "nodejs";

export const GET = withRoute(async (request) => {
  const user = await getAuthUser(request);
  const params = request.nextUrl.searchParams;
  const organizationId = params.get("organizationId");
  if (organizationId) assertOrganizationAccess(user, organizationId);

  const workers = await prisma.worker.findMany({
    where: {
      is_deleted: false,
      isActive: true,
      ...organizationScope(user),
      ...(organizationId ? { organizationId } : {}),
      ...(params.get("unassigned") === "true" ? { workerNode: null } : {}),
    },
    select: { id: true, workerCode: true, name: true, organizationId: true },
    orderBy: { name: "asc" },
  });

  return ok(workers);
});
