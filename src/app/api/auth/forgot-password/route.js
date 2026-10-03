import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { config } from "@/lib/config";
import { redis } from "@/lib/redis";
import { sendPasswordResetOtp } from "@/lib/mail";
import { assertOrganizationOperational } from "@/lib/license";
import { assert } from "@/lib/validation";
import { ApiError } from "@/lib/errors";

export const runtime = "nodejs";

const GENERIC_MESSAGE = "If the email is registered, an OTP will be sent.";
const { expirySeconds, resendCooldownSeconds } = config.otp;
const generic = () => ok({ expiresInSeconds: expirySeconds, resendCooldownSeconds }, GENERIC_MESSAGE);

export const POST = withRoute(async (request) => {
  const body = await request.json();
  assert(typeof body?.email === "string" && body.email.trim().length > 0, "email is required");
  const email = body.email.trim().toLowerCase();

  const user = await prisma.user.findFirst({ where: { email, is_deleted: false, isActive: true } });
  if (!user) return generic();
  if (user.role === "ADMIN") {
    try {
      await assertOrganizationOperational(prisma, user.organizationId);
    } catch {
      return generic();
    }
  }

  const otpKey = `otp:${email}`;
  const existing = await redis.get(otpKey);
  if (existing) {
    const elapsed = Date.now() - JSON.parse(existing).createdAt;
    if (elapsed < resendCooldownSeconds * 1000) {
      const retryAfterSeconds = Math.ceil((resendCooldownSeconds * 1000 - elapsed) / 1000);
      throw new ApiError(`Please wait ${retryAfterSeconds} seconds before requesting a new OTP.`, 429, "OTP_COOLDOWN", { retryAfterSeconds });
    }
  }

  const otpCode = String(crypto.randomInt(100000, 1000000));
  await redis.setEx(otpKey, expirySeconds, JSON.stringify({ otpCode, attemptCount: 0, createdAt: Date.now(), userId: user.id }));

  try {
    await sendPasswordResetOtp(email, otpCode, Math.round(expirySeconds / 60));
  } catch (error) {
    console.error("Failed to send password reset OTP:", error.message);
    await redis.del(otpKey);
  }

  return generic();
});
