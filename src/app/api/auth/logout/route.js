import { withRoute, ok } from "@/lib/apiResponse";
import { verifyToken } from "@/lib/jwt";
import { config } from "@/lib/config";
import { redis } from "@/lib/redis";
import { assert } from "@/lib/validation";

export const runtime = "nodejs";

export const POST = withRoute(async (request) => {
  const body = await request.json();
  assert(typeof body?.refreshToken === "string" && body.refreshToken.length > 0, "refreshToken is required");

  let payload = null;
  try {
    payload = verifyToken(body.refreshToken, config.jwtSecret);
  } catch {
  }
  if (payload?.type === "refresh" && payload.jti) {
    const remaining = payload.exp - Math.floor(Date.now() / 1000);
    if (remaining > 0) await redis.setEx(`revoked_refresh:${payload.jti}`, remaining, "1");
  }

  return ok(null, "Logged out");
});
