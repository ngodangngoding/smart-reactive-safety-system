import crypto from "node:crypto";
import { signToken } from "@/lib/jwt";
import { config } from "@/lib/config";

export function issueTokens(user, { actingOrganizationId = null, refresh = true } = {}) {
  const claims = { sub: user.id, role: user.role, organizationId: user.organizationId, tv: user.tokenVersion };
  if (user.role === "SUPERADMIN" && actingOrganizationId) claims.actingOrganizationId = actingOrganizationId;

  const accessToken = signToken({ ...claims, type: "access", jti: crypto.randomUUID() }, config.jwtSecret, config.accessTtl);
  const result = { accessToken, expiresIn: config.accessTtl };
  if (refresh) result.refreshToken = signToken({ ...claims, type: "refresh", jti: crypto.randomUUID() }, config.jwtSecret, config.refreshTtl);
  return result;
}
