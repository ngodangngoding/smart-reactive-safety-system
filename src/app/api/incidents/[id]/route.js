import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole, assertOrganizationAccess } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";
import { softDeleteData } from "@/lib/softDelete";
import { NotFoundError, ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

export const GET = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  const { id } = await params;

  const incident = await prisma.incident.findFirst({
    where: { id, is_deleted: false },
    include: {
      worker: true,
      workerNode: true,
      triggerTelemetry: true,
      resolvedBy: { select: { id: true, name: true } },
      organization: { select: { name: true } },
    },
  });
  if (!incident) throw new NotFoundError("Incident not found");
  assertOrganizationAccess(user, incident.organizationId);

  return ok(incident);
});

// SUPERADMIN only, and only for RESOLVED incidents (an ACTIVE emergency must never disappear).
export const DELETE = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);

  const { id } = await params;
  await prisma.$transaction(async (tx) => {
    const incident = await tx.incident.findFirst({ where: { id, is_deleted: false } });
    if (!incident) throw new NotFoundError("Incident not found");
    assertOrganizationAccess(user, incident.organizationId);
    if (incident.status !== "RESOLVED") throw new ValidationError("Only RESOLVED incidents can be deleted", "INCIDENT_NOT_RESOLVED");

    await tx.incident.update({ where: { id }, data: softDeleteData() });
    await writeAuditLog(
      { organizationId: incident.organizationId, performedByUserId: user.id, action: "SOFT_DELETE_INCIDENT", metadata: { target: { table: "Incident", id } } },
      tx
    );
  });

  return ok({ id }, "Incident deleted successfully.", 200, "INCIDENT_DELETED");
});
