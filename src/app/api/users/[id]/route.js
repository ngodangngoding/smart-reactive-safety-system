import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";
import { hashPassword } from "@/lib/password";
import { assertOrganizationOperational } from "@/lib/license";
import { assert } from "@/lib/validation";
import { USER_INCLUDE, serializeUser } from "@/lib/serializers";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { softDeleteUsersTx, CASCADE_TX_OPTIONS } from "@/lib/cascade";

async function loadUser(id) {
  const record = await prisma.user.findFirst({ where: { id, is_deleted: false }, include: USER_INCLUDE });
  if (!record) throw new NotFoundError("User not found");
  return record;
}

export const GET = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);

  const { id } = await params;
  return ok(serializeUser(await loadUser(id)));
});

export const PATCH = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);

  const { id } = await params;
  const before = await loadUser(id);
  const body = await request.json();

  const data = {};
  let revokeSessions = false;

  if (typeof body?.name === "string") data.name = body.name.trim();
  if (typeof body?.email === "string" && body.email.trim().toLowerCase() !== before.email) {
    assert(body.email.trim().length > 0, "email is required");
    data.email = body.email.trim().toLowerCase();
  }
  if (typeof body?.isActive === "boolean" && body.isActive !== before.isActive) {
    data.isActive = body.isActive;
    if (!body.isActive) revokeSessions = true;
  }
  if (typeof body?.password === "string" && body.password.length > 0) {
    assert(body.password.length >= 8, "password must be at least 8 characters");
    data.passwordHash = hashPassword(body.password);
    revokeSessions = true;
  }

  const nextRole = body?.role === "SUPERADMIN" || body?.role === "ADMIN" ? body.role : before.role;
  const nextOrganizationId = nextRole === "SUPERADMIN" ? null : typeof body?.organizationId === "string" ? body.organizationId : before.organizationId;
  assert(nextRole === "SUPERADMIN" || nextOrganizationId, "organizationId is required for ADMIN");
  if (nextRole === "ADMIN" && nextOrganizationId !== before.organizationId) await assertOrganizationOperational(prisma, nextOrganizationId);
  if (nextRole !== before.role || nextOrganizationId !== before.organizationId) {
    data.role = nextRole;
    data.organizationId = nextOrganizationId;
    revokeSessions = true;
  }
  if (revokeSessions) data.tokenVersion = { increment: 1 };

  const updated = await prisma.user.update({ where: { id }, data, include: USER_INCLUDE });

  await writeAuditLog({
    organizationId: updated.organizationId,
    performedByUserId: user.id,
    action: "UPDATE_USER",
    metadata: { target: { table: "User", id }, before: { isActive: before.isActive, role: before.role }, after: { isActive: updated.isActive, role: updated.role } },
  });

  return ok(serializeUser(updated), "User updated successfully.", 200, "USER_UPDATED");
});

export const DELETE = withRoute(async (request, { params }) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);

  const { id } = await params;
  const target = await loadUser(id);

  if (target.id === user.id) throw new ValidationError("You cannot delete your own account", "CANNOT_DELETE_SELF");
  if (target.role === "SUPERADMIN") {
    const others = await prisma.user.count({ where: { role: "SUPERADMIN", is_deleted: false, isActive: true, id: { not: id } } });
    if (others === 0) throw new ValidationError("The last active SUPERADMIN cannot be deleted", "LAST_SUPERADMIN");
  }

  await prisma.$transaction(async (tx) => {
    await softDeleteUsersTx(tx, { userIds: [id] });
    await writeAuditLog(
      { organizationId: target.organizationId, performedByUserId: user.id, action: "SOFT_DELETE_USER", metadata: { target: { table: "User", id } } },
      tx
    );
  }, CASCADE_TX_OPTIONS);

  return ok({ id }, "User deleted successfully.", 200, "USER_DELETED");
});
