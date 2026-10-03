import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";
import { AuthError } from "@/lib/errors";
import { config } from "@/lib/config";
import { assertOrganizationOperational } from "@/lib/license";

export async function loadUserFromToken(token, expectedType) {
  let payload;
  try {
    payload = verifyToken(token, config.jwtSecret);
  } catch {
    throw new AuthError("Invalid or expired token");
  }
  if (payload.type !== expectedType) throw new AuthError("Invalid token type");

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.is_deleted || !user.isActive || payload.tv !== user.tokenVersion) {
    throw new AuthError("Session is no longer valid", 401, "TOKEN_REVOKED");
  }
  return { user, payload };
}

export async function getAuthUser(request, { skipActingCheck = false } = {}) {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new AuthError("Authentication required");
  }

  const { user, payload } = await loadUserFromToken(token, "access");

  if (user.role === "ADMIN") {
    await assertOrganizationOperational(prisma, user.organizationId);
  }

  let actingOrganizationId = null;
  if (user.role === "SUPERADMIN" && typeof payload.actingOrganizationId === "string") {
    if (!skipActingCheck) {
      try {
        await assertOrganizationOperational(prisma, payload.actingOrganizationId);
      } catch {
        throw new AuthError("The organization you are acting as is no longer available", 403, "ACTING_ORG_UNAVAILABLE");
      }
    }
    actingOrganizationId = payload.actingOrganizationId;
  }

  return { ...user, actingOrganizationId };
}

export function requireRole(user, roles) {
  if (!roles.includes(user.role)) {
    throw new AuthError("You do not have permission to perform this action", 403);
  }
}

export function assertOrganizationAccess(user, organizationId) {
  if (user.actingOrganizationId) {
    if (organizationId !== user.actingOrganizationId) {
      throw new AuthError("You do not have access to this organization's data", 403);
    }
    return;
  }
  if (user.role === "SUPERADMIN") return;
  if (!organizationId || user.organizationId !== organizationId) {
    throw new AuthError("You do not have access to this organization's data", 403);
  }
}

export function organizationScope(user) {
  if (user.actingOrganizationId) return { organizationId: user.actingOrganizationId };
  return user.role === "SUPERADMIN" ? {} : { organizationId: user.organizationId };
}

export function toSafeUser(user) {
  const { passwordHash, tokenVersion, actingOrganizationId, is_deleted, deletedAt, ...safe } = user;
  return safe;
}
