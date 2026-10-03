import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, assertOrganizationAccess } from "@/lib/auth";
import { assert } from "@/lib/validation";
import { NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";

export const GET = withRoute(async (request) => {
  const user = await getAuthUser(request);
  const params = request.nextUrl.searchParams;
  const workerNodeId = params.get("workerNodeId");
  const from = params.get("from");
  const to = params.get("to");
  const ranged = Boolean(from || to);
  const limit = Math.min(Number(params.get("limit")) || (ranged ? 5000 : 50), ranged ? 5000 : 200);

  assert(typeof workerNodeId === "string" && workerNodeId.length > 0, "workerNodeId is required");
  assert(!from || !Number.isNaN(new Date(from).getTime()), "from must be a valid ISO date");
  assert(!to || !Number.isNaN(new Date(to).getTime()), "to must be a valid ISO date");

  const workerNode = await prisma.workerNode.findFirst({ where: { id: workerNodeId, is_deleted: false } });
  if (!workerNode) throw new NotFoundError("WorkerNode not found");
  assertOrganizationAccess(user, workerNode.organizationId);

  const telemetry = await prisma.telemetry.findMany({
    where: {
      workerNodeId,
      is_deleted: false,
      ...(ranged ? { receivedAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lt: new Date(to) } : {}) } } : {}),
    },
    orderBy: { receivedAt: "desc" },
    take: limit,
  });

  return ok(telemetry.reverse());
});
