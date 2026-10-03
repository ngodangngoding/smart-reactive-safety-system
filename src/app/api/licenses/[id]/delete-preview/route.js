import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole } from "@/lib/auth";
import { getLicenseDeletePreview } from "@/lib/cascade";
import { NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";

export const GET = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);

  const { id } = await params;
  const exists = await prisma.license.findFirst({ where: { id, is_deleted: false }, select: { id: true } });
  if (!exists) throw new NotFoundError("License not found");

  return ok(await getLicenseDeletePreview(prisma, id));
});
