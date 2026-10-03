import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, assertOrganizationAccess } from "@/lib/auth";
import { assert } from "@/lib/validation";
import { NotFoundError } from "@/lib/errors";

export const GET = withRoute(async (request) => {
  const user = await getAuthUser(request);
  const workerNodeId = request.nextUrl.searchParams.get("workerNodeId");
  assert(typeof workerNodeId === "string" && workerNodeId.length > 0, "workerNodeId is required");

  const workerNode = await prisma.workerNode.findFirst({ where: { id: workerNodeId, is_deleted: false } });
  if (!workerNode) throw new NotFoundError("WorkerNode not found");
  assertOrganizationAccess(user, workerNode.organizationId);

  const latest = await prisma.telemetry.findFirst({
    where: { workerNodeId, is_deleted: false },
    orderBy: { receivedAt: "desc" },
  });

  return ok(latest);
});
