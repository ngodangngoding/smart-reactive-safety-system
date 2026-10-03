import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole } from "@/lib/auth";
import { getOrganizationDeletePreview } from "@/lib/cascade";
import { NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";

export const GET = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);

  const { id } = await params;
  const exists = await prisma.organization.findFirst({ where: { id, is_deleted: false }, select: { id: true } });
  if (!exists) throw new NotFoundError("Organization not found");

  return ok(await getOrganizationDeletePreview(prisma, id));
});
