import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole } from "@/lib/auth";

export const runtime = "nodejs";

export const GET = withRoute(async (request) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);

  const excludeOrganizationId = request.nextUrl.searchParams.get("excludeOrganizationId");
  const taken = await prisma.organization.findMany({
    where: { licenseId: { not: null }, is_deleted: false, ...(excludeOrganizationId ? { id: { not: excludeOrganizationId } } : {}) },
    select: { licenseId: true },
  });

  return ok(
    await prisma.license.findMany({
      where: { is_deleted: false, id: { notIn: taken.map((org) => org.licenseId) } },
      select: { id: true, name: true, maxDevice: true },
      orderBy: { name: "asc" },
    })
  );
});
