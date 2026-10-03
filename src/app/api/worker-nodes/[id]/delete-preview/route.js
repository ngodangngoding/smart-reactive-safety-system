import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole, assertOrganizationAccess } from "@/lib/auth";
import { getWorkerNodeDeletePreview } from "@/lib/cascade";
import { NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";

export const GET = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN", "ADMIN"]);

  const { id } = await params;
  const node = await prisma.workerNode.findFirst({ where: { id, is_deleted: false }, select: { organizationId: true } });
  if (!node) throw new NotFoundError("WorkerNode not found");
  assertOrganizationAccess(user, node.organizationId);

  return ok(await getWorkerNodeDeletePreview(prisma, id));
});
