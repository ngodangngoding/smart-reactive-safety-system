import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole } from "@/lib/auth";

export const runtime = "nodejs";

export const GET = withRoute(async (request) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);

  const operationalOnly = request.nextUrl.searchParams.get("operationalOnly") === "true";
  const where = { is_deleted: false, isActive: true, ...(operationalOnly ? { licenseId: { not: null }, license: { is_deleted: false } } : {}) };

  return ok(await prisma.organization.findMany({ where, select: { id: true, name: true }, orderBy: { name: "asc" } }));
});
