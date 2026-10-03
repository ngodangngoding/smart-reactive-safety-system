import crypto from "node:crypto";
import { withRoute, ok } from "@/lib/apiResponse";
import { config } from "@/lib/config";
import { redis } from "@/lib/redis";
import { assert } from "@/lib/validation";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

const { maxAttempts, resetTokenTtlSeconds } = config.otp;

const VERIFY_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return {'NOT_FOUND'} end
local d = cjson.decode(raw)
local maxA = tonumber(ARGV[2])
if tonumber(d.attemptCount) >= maxA then redis.call('DEL', KEYS[1]); return {'LOCKED'} end
if tostring(d.otpCode) == ARGV[1] then
  redis.call('DEL', KEYS[1])
  return {'OK', tostring(d.userId)}
end
d.attemptCount = tonumber(d.attemptCount) + 1
local remaining = maxA - d.attemptCount
if remaining <= 0 then redis.call('DEL', KEYS[1]); return {'LOCKED'} end
local ttl = redis.call('TTL', KEYS[1])
if ttl <= 0 then redis.call('DEL', KEYS[1]); return {'NOT_FOUND'} end
redis.call('SET', KEYS[1], cjson.encode(d), 'EX', ttl)
return {'INVALID', tostring(remaining)}
`;

export const POST = withRoute(async (request) => {
  const body = await request.json();
  assert(typeof body?.email === "string" && body.email.trim().length > 0, "email is required");
  assert(typeof body?.otpCode === "string" && /^\d{6}$/.test(body.otpCode), "otpCode must be exactly 6 digits");
  const email = body.email.trim().toLowerCase();

  const [result, detail] = await redis.evalScript(VERIFY_SCRIPT, [`otp:${email}`], [body.otpCode, String(maxAttempts)]);

  if (result === "NOT_FOUND") throw new ValidationError("Invalid or expired OTP code.", "OTP_EXPIRED");
  if (result === "LOCKED") throw new ValidationError("OTP invalidated due to too many failed attempts. Please request a new one.", "OTP_LOCKED");
  if (result === "INVALID") {
    throw new ValidationError(`Invalid OTP code. ${detail} attempt(s) remaining.`, "OTP_INVALID", { remainingAttempts: Number(detail) });
  }

  const userId = detail;
  const previous = await redis.get(`reset_token_user:${userId}`);
  if (previous) await redis.del(`reset_token:${previous}`);

  const resetToken = crypto.randomUUID();
  await redis.multiSetEx([
    [`reset_token:${resetToken}`, resetTokenTtlSeconds, JSON.stringify({ userId, email })],
    [`reset_token_user:${userId}`, resetTokenTtlSeconds, resetToken],
  ]);

  return ok({ resetToken, expiresInSeconds: resetTokenTtlSeconds }, "OTP verified successfully");
});
