import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import { issueTokens } from "@/lib/tokens";
import { hashPassword, verifyPassword } from "@/lib/password";
import { writeAuditLog } from "@/lib/auditLog";
import { assert } from "@/lib/validation";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

export const PATCH = withRoute(async (request) => {
  const user = await getAuthUser(request);
  const body = await request.json();
  assert(typeof body?.newPassword === "string" && body.newPassword.length >= 8, "newPassword must be at least 8 characters");

  if (user.hasPassword) {
    assert(typeof body?.currentPassword === "string" && body.currentPassword.length > 0, "currentPassword is required");
    if (!verifyPassword(body.currentPassword, user.passwordHash)) {
      throw new ValidationError("Current password is incorrect", "VALIDATION_ERROR", { fields: { currentPassword: "Current password is incorrect" } });
    }
    if (body.newPassword === body.currentPassword) {
      throw new ValidationError("New password must differ from the current one", "PASSWORD_REUSED");
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(body.newPassword), hasPassword: true, tokenVersion: { increment: 1 } } });
    await writeAuditLog({ organizationId: next.organizationId, performedByUserId: user.id, action: "CHANGE_PASSWORD", metadata: { target: { table: "User", id: user.id } } }, tx);
    return next;
  });

  return ok(issueTokens(updated, { actingOrganizationId: user.actingOrganizationId }), user.hasPassword ? "Password changed successfully." : "Password set successfully.", 200, "PASSWORD_CHANGED");
});
