import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { config } from "@/lib/config";
import { redis } from "@/lib/redis";
import { hashPassword, verifyPassword } from "@/lib/password";
import { writeAuditLog } from "@/lib/auditLog";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

const invalidToken = () => new ValidationError("Invalid or expired reset token.", "RESET_TOKEN_INVALID");

export const POST = withRoute(async (request) => {
  const body = await request.json();
  const fields = {};
  if (typeof body?.resetToken !== "string" || !body.resetToken) fields.resetToken = "resetToken is required";
  if (typeof body?.newPassword !== "string" || body.newPassword.length < 8) fields.newPassword = "Password must be at least 8 characters";
  else if (body.newPassword !== body.confirmPassword) fields.confirmPassword = "Passwords do not match";
  if (Object.keys(fields).length > 0) {
    throw new ValidationError(Object.values(fields)[0], "VALIDATION_ERROR", { fields });
  }

  const tokenKey = `reset_token:${body.resetToken}`;
  const raw = await redis.getDel(tokenKey);
  if (!raw) throw invalidToken();
  const { userId, email } = JSON.parse(raw);
  const restoreToken = () => redis.setEx(tokenKey, config.otp.resetTokenTtlSeconds, raw);

  const user = await prisma.user.findFirst({ where: { id: userId, is_deleted: false, isActive: true } });
  if (!user) throw invalidToken();

  if (verifyPassword(body.newPassword, user.passwordHash)) {
    await restoreToken();
    throw new ValidationError("New password must differ from the current one", "PASSWORD_REUSED", { fields: { newPassword: "New password must differ from the current one" } });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash: hashPassword(body.newPassword), hasPassword: true, tokenVersion: { increment: 1 } } });
      await writeAuditLog({ organizationId: user.organizationId, performedByUserId: userId, action: "RESET_PASSWORD", metadata: { target: { table: "User", id: userId } } }, tx);
    });
  } catch (error) {
    await restoreToken().catch(() => { });
    throw error;
  }

  await redis.del(`reset_token_user:${userId}`, `otp:${email}`);

  return ok(null, "Password reset successfully.");
});
