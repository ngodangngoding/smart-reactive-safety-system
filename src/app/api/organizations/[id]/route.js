import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole, assertOrganizationAccess } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";
import { NotFoundError } from "@/lib/errors";
import { ORGANIZATION_INCLUDE, serializeOrganization } from "@/lib/serializers";
import { softDeleteOrganizationTx, CASCADE_TX_OPTIONS } from "@/lib/cascade";
import { assertLicenseUsable, assertLicenseFitsOrganization, assertLicenseAvailable } from "@/lib/license";

async function loadOrganization(id) {
  const record = await prisma.organization.findFirst({ where: { id, is_deleted: false }, include: ORGANIZATION_INCLUDE });
  if (!record) throw new NotFoundError("Organization not found");
  return record;
}

export const GET = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  const { id } = await params;
  assertOrganizationAccess(user, id);

  return ok(serializeOrganization(await loadOrganization(id)));
});

export const PATCH = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);

  const { id } = await params;
  const before = await loadOrganization(id);
  const body = await request.json();

  const data = {};
  if (typeof body?.name === "string") data.name = body.name.trim();
  if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
  if (body?.licenseId !== undefined) {
    const license = await assertLicenseUsable(body.licenseId);
    await assertLicenseAvailable(body.licenseId, id);
    await assertLicenseFitsOrganization(license, id);
    data.licenseId = license.id;
  }

  const updated = await prisma.organization.update({ where: { id }, data, include: ORGANIZATION_INCLUDE });

  await writeAuditLog({
    organizationId: id,
    performedByUserId: user.id,
    action: "UPDATE_ORGANIZATION",
    metadata: { target: { table: "Organization", id }, before: { name: before.name, isActive: before.isActive, licenseId: before.licenseId }, after: { name: updated.name, isActive: updated.isActive, licenseId: updated.licenseId } },
  });

  return ok(serializeOrganization(updated), "Organization updated successfully.", 200, "ORGANIZATION_UPDATED");
});

export const DELETE = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);

  const { id } = await params;
  const result = await prisma.$transaction((tx) => softDeleteOrganizationTx(tx, { organizationId: id, actorUserId: user.id }), CASCADE_TX_OPTIONS);
  if (!result) throw new NotFoundError("Organization not found");

  return ok({ id, cascade: result.cascade }, "Organization deleted successfully.", 200, "ORGANIZATION_DELETED");
});
