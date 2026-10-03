import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { writeAuditLog } from "@/lib/auditLog";
import { ValidationError } from "@/lib/errors";
import { verifyPassword } from "@/lib/password";
import { softDeleteUsersTx, CASCADE_TX_OPTIONS } from "@/lib/cascade";
import { getAuthUser, toSafeUser } from "@/lib/auth";
import { getOrganizationSummary } from "@/lib/license";
import { getPermissionMenu } from "@/lib/permissions";

export const runtime = "nodejs";

export const GET = withRoute(async (request) => {
  const user = await getAuthUser(request);

  const organization = await getOrganizationSummary(prisma, user.actingOrganizationId ?? user.organizationId);

  return ok({
    user: { ...toSafeUser(user), organization },
    organization,
    actingOrganizationId: user.actingOrganizationId,
    actingOrganization: user.actingOrganizationId ? organization : null,
    permissions: getPermissionMenu(user.actingOrganizationId ? "ADMIN" : user.role),
  });
});

export const PATCH = withRoute(async (request) => {
  const user = await getAuthUser(request);
  const body = await request.json();

  const fields = {};
  const data = {};
  if (body?.name !== undefined) {
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    else fields.name = "name is required";
  }
  if (body?.email !== undefined) {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (/^\S+@\S+\.\S+$/.test(email)) data.email = email;
    else fields.email = "Enter a valid email address";
  }
  if (Object.keys(fields).length > 0) throw new ValidationError(Object.values(fields)[0], "VALIDATION_ERROR", { fields });
  if (Object.keys(data).length === 0) throw new ValidationError("Send name and/or email", "VALIDATION_ERROR", { fields: {} });

  const updated = await prisma.user.update({ where: { id: user.id }, data });

  const changed = Object.keys(data).filter((key) => data[key] !== user[key]);
  await writeAuditLog({
    organizationId: updated.organizationId,
    performedByUserId: user.id,
    action: "UPDATE_USER",
    metadata: {
      target: { table: "User", id: user.id },
      before: Object.fromEntries(changed.map((key) => [key, user[key]])),
      after: Object.fromEntries(changed.map((key) => [key, updated[key]])),
    },
  });

  return ok({ user: toSafeUser(updated) }, "Profile updated successfully.", 200, "PROFILE_UPDATED");
});

// Deletes the caller's own account (soft delete, email freed, every session revoked). Needs the password.
export const DELETE = withRoute(async (request) => {
  const user = await getAuthUser(request);
  const body = await request.json().catch(() => ({}));

  if (typeof body?.password !== "string" || !verifyPassword(body.password, user.passwordHash)) {
    throw new ValidationError("Incorrect password", "VALIDATION_ERROR", { fields: { password: "Incorrect password" } });
  }
  if (user.role === "SUPERADMIN") {
    const others = await prisma.user.count({ where: { role: "SUPERADMIN", is_deleted: false, isActive: true, id: { not: user.id } } });
    if (others === 0) throw new ValidationError("The last active SUPERADMIN cannot be deleted", "LAST_SUPERADMIN");
  }

  await prisma.$transaction(async (tx) => {
    await softDeleteUsersTx(tx, { userIds: [user.id] });
    await writeAuditLog(
      { organizationId: user.organizationId, performedByUserId: user.id, action: "SOFT_DELETE_USER", metadata: { target: { table: "User", id: user.id }, self: true } },
      tx
    );
  }, CASCADE_TX_OPTIONS);

  return ok(null, "Your account was deleted.", 200, "ACCOUNT_DELETED");
});
