import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, assertOrganizationAccess } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";
import { loadMonitoringEntry } from "@/lib/monitoring";

export const runtime = "nodejs";

export const GET = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  const { workerId } = await params;

  const worker = await prisma.worker.findFirst({
    where: { id: workerId, is_deleted: false },
    include: { workerNode: true, organization: { select: { name: true, is_deleted: true } } },
  });
  if (!worker) throw new NotFoundError("Worker not found");
  assertOrganizationAccess(user, worker.organizationId);

  return ok(await loadMonitoringEntry(prisma, worker));
});
