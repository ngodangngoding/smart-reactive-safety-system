import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { verifyPassword } from "@/lib/password";
import { createLoginSession } from "@/lib/loginSession";
import { assert } from "@/lib/validation";
import { AuthError } from "@/lib/errors";

export const runtime = "nodejs";

export const POST = withRoute(async (request) => {
  const body = await request.json();
  assert(typeof body?.email === "string" && body.email.trim().length > 0, "Email is required");
  assert(typeof body?.password === "string" && body.password.length > 0, "Password is required");

  const user = await prisma.user.findFirst({ where: { email: body.email.trim().toLowerCase(), is_deleted: false } });
  if (!user || !user.isActive || !verifyPassword(body.password, user.passwordHash)) {
    throw new AuthError("Invalid email or password");
  }

  return ok(await createLoginSession(user), "Login successful");
});
