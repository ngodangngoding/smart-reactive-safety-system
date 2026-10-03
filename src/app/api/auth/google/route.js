import { OAuth2Client } from "google-auth-library";
import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { config } from "@/lib/config";
import { createLoginSession } from "@/lib/loginSession";
import { assert } from "@/lib/validation";
import { ApiError, AuthError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import crypto from "node:crypto";

export const runtime = "nodejs";

let client;

async function verifyGoogleIdToken(idToken) {
  client ??= new OAuth2Client(config.google.clientId);

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: config.google.clientId });
    payload = ticket.getPayload();
  } catch (error) {
    if (/certs|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|fetch failed/i.test(`${error.code ?? ""} ${error.message}`)) {
      throw new ApiError("Google sign-in is temporarily unavailable", 503, "SERVICE_UNAVAILABLE");
    }
    throw new AuthError("Invalid Google credential", 401, "GOOGLE_TOKEN_INVALID");
  }

  if (!payload?.email || payload.email_verified !== true) {
    throw new AuthError("Invalid Google credential", 401, "GOOGLE_TOKEN_INVALID");
  }
  return { email: payload.email.toLowerCase(), name: payload.name || payload.email };
}

export const POST = withRoute(async (request) => {
  if (!config.google.clientId) {
    throw new ApiError("Google sign-in is not configured", 503, "SERVICE_UNAVAILABLE");
  }

  const body = await request.json();
  assert(typeof body?.idToken === "string" && body.idToken.length > 0, "idToken is required");

  const { email, name } = await verifyGoogleIdToken(body.idToken);
  let user = await prisma.user.findFirst({ where: { email, is_deleted: false } });
  if (user && !user.isActive) {
    throw new AuthError("This account has been deactivated", 401, "GOOGLE_ACCOUNT_NOT_LINKED");
  }
  user ??= await prisma.user.create({
    data: { name, email, passwordHash: hashPassword(crypto.randomUUID()), hasPassword: false, role: "PENDING" },
  });

  return ok(await createLoginSession(user, { viaGoogle: true }), "Login successful");
});
