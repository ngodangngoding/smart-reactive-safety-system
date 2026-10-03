import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";
import { assert } from "@/lib/validation";
import { hashPassword } from "@/lib/password";
import { assertOrganizationOperational } from "@/lib/license";
import { parsePagination, paginated } from "@/lib/pagination";
import { USER_INCLUDE, serializeUser } from "@/lib/serializers";

export const runtime = "nodejs";

export const GET = withRoute(async (request) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);

  const params = request.nextUrl.searchParams;
  const page = parsePagination(params, ["createdAt", "name", "email", "role", "lastLoginAt"]);
  const orderBy = page.orderBy.lastLoginAt ? { lastLoginAt: { sort: page.orderBy.lastLoginAt, nulls: "last" } } : page.orderBy;
  const search = params.get("search")?.trim();
  const organizationId = params.get("organizationId");
  const role = params.get("role");
  const isActive = params.get("isActive");

  const where = {
    is_deleted: false,
    ...(organizationId ? { organizationId } : {}),
    ...(role === "SUPERADMIN" || role === "ADMIN" ? { role } : {}),
    ...(isActive === "true" || isActive === "false" ? { isActive: isActive === "true" } : {}),
    ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, include: USER_INCLUDE, orderBy, skip: page.skip, take: page.take }),
    prisma.user.count({ where }),
  ]);

  return ok(paginated(users.map(serializeUser), total, page));
});

export const POST = withRoute(async (request) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);

  const body = await request.json();
  assert(typeof body?.name === "string" && body.name.trim().length > 0, "name is required");
  assert(typeof body?.email === "string" && body.email.trim().length > 0, "email is required");
  assert(typeof body?.password === "string" && body.password.length >= 8, "password must be at least 8 characters");
  assert(body?.role === "SUPERADMIN" || body?.role === "ADMIN", "role must be SUPERADMIN or ADMIN");
  if (body.role === "ADMIN") {
    assert(typeof body?.organizationId === "string" && body.organizationId.length > 0, "organizationId is required for ADMIN");
    await assertOrganizationOperational(prisma, body.organizationId);
  } else {
    assert(body?.organizationId == null, "organizationId must be empty for SUPERADMIN");
  }

  const created = await prisma.user.create({
    data: {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      passwordHash: hashPassword(body.password),
      role: body.role,
      organizationId: body.role === "ADMIN" ? body.organizationId : null,
    },
    include: USER_INCLUDE,
  });

  await writeAuditLog({
    organizationId: created.organizationId,
    performedByUserId: user.id,
    action: "CREATE_USER",
    metadata: { target: { table: "User", id: created.id } },
  });

  return ok(serializeUser(created), "User created successfully.", 201, "USER_CREATED");
});
