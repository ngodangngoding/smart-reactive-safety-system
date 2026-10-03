import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole, assertOrganizationAccess } from "@/lib/auth";
import { getWorkerDeletePreview } from "@/lib/cascade";
import { NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";

export const GET = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN", "ADMIN"]);

  const { id } = await params;
  const worker = await prisma.worker.findFirst({ where: { id, is_deleted: false }, select: { organizationId: true } });
  if (!worker) throw new NotFoundError("Worker not found");
  assertOrganizationAccess(user, worker.organizationId);

  return ok(await getWorkerDeletePreview(prisma, id));
});
