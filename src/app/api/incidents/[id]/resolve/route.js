import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole, assertOrganizationAccess } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";
import { NotFoundError, ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

export const POST = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN", "ADMIN"]);

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim() : undefined;
  const incident = await prisma.incident.findFirst({ where: { id, is_deleted: false } });
  if (!incident) throw new NotFoundError("Incident not found");
  assertOrganizationAccess(user, incident.organizationId);
  if (incident.status !== "ACTIVE") throw new ValidationError("Incident is not ACTIVE", "INCIDENT_NOT_ACTIVE");

  const resolved = await prisma.incident.update({
    where: { id },
    data: { status: "RESOLVED", resolvedAt: new Date(), resolvedById: user.id, resolutionNote: note ?? null },
  });

  await writeAuditLog({
    organizationId: incident.organizationId,
    performedByUserId: user.id,
    action: "RESOLVE_INCIDENT",
    metadata: { target: { table: "Incident", id }, ...(note ? { note } : {}) },
  });

  return ok(resolved, "Incident marked as resolved.", 200, "INCIDENT_RESOLVED");
});
