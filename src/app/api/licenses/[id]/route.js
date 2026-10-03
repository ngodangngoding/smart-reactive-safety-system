import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";
import { validateLicenseBody, assertQuotaCoversUsage, serializeLicenses, licensePeriod } from "@/lib/license";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { softDeleteData } from "@/lib/softDelete";

async function loadLicense(id) {
  const record = await prisma.license.findFirst({ where: { id, is_deleted: false } });
  if (!record) throw new NotFoundError("License not found");
  return record;
}

export const GET = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);
  const { id } = await params;
  return ok((await serializeLicenses(prisma, [await loadLicense(id)]))[0]);
});

export const PATCH = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);

  const { id } = await params;
  const before = await loadLicense(id);
  const data = validateLicenseBody(await request.json(), before);
  if (data.maxDevice !== undefined) await assertQuotaCoversUsage(id, data.maxDevice);
  const updated = await prisma.license.update({ where: { id }, data });

  await writeAuditLog({
    performedByUserId: user.id,
    action: "UPDATE_LICENSE",
    metadata: {
      target: { table: "License", id },
      before: { name: before.name, maxDevice: before.maxDevice, ...licensePeriod(before) },
      after: { name: updated.name, maxDevice: updated.maxDevice, ...licensePeriod(updated) },
    },
  });

  const renewed = licensePeriod(before).status === "expired" && licensePeriod(updated).status === "active";
  return ok(
    (await serializeLicenses(prisma, [updated]))[0],
    renewed ? "License renewed successfully." : "License updated successfully.",
    200,
    renewed ? "LICENSE_RENEWED" : "LICENSE_UPDATED"
  );
});

export const DELETE = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);

  const { id } = await params;
  await prisma.$transaction(async (tx) => {
    const license = await tx.license.findFirst({ where: { id, is_deleted: false } });
    if (!license) throw new NotFoundError("License not found");

    const organizations = await tx.organization.findMany({ where: { licenseId: id, is_deleted: false }, select: { id: true, name: true } });
    if (organizations.length > 0) {
      throw new ConflictError(`License is assigned to ${organizations.length} organization(s); reassign them first`, "LICENSE_IN_USE", { organizations });
    }

    await tx.license.update({ where: { id }, data: softDeleteData() });
    await writeAuditLog({ performedByUserId: user.id, action: "SOFT_DELETE_LICENSE", metadata: { target: { table: "License", id } } }, tx);
  });

  return ok({ id }, "License deleted successfully.", 200, "LICENSE_DELETED");
});
