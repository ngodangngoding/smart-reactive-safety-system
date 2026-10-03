import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { loadUserFromToken } from "@/lib/auth";
import { issueTokens } from "@/lib/tokens";
import { assertOrganizationOperational } from "@/lib/license";
import { redis } from "@/lib/redis";
import { assert } from "@/lib/validation";
import { AuthError } from "@/lib/errors";

export const runtime = "nodejs";

export const POST = withRoute(async (request) => {
  const body = await request.json();
  assert(typeof body?.refreshToken === "string" && body.refreshToken.length > 0, "refreshToken is required");

  const { user, payload } = await loadUserFromToken(body.refreshToken, "refresh");
  if (await redis.get(`revoked_refresh:${payload.jti}`)) {
    throw new AuthError("Session is no longer valid", 401, "TOKEN_REVOKED");
  }
  if (user.role === "ADMIN") await assertOrganizationOperational(prisma, user.organizationId);

  return ok(issueTokens(user, { actingOrganizationId: payload.actingOrganizationId }), "Token refreshed");
});
