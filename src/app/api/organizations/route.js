import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";
import { assert } from "@/lib/validation";
import { assertLicenseUsable, assertLicenseAvailable } from "@/lib/license";
import { parsePagination, paginated } from "@/lib/pagination";
import { ORGANIZATION_INCLUDE, serializeOrganization } from "@/lib/serializers";

export const runtime = "nodejs";

export const GET = withRoute(async (request) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);

  const params = request.nextUrl.searchParams;
  const page = parsePagination(params, ["createdAt", "name"]);
  const search = params.get("search")?.trim();
  const isActive = params.get("isActive");
  const licenseId = params.get("licenseId");

  const where = {
    is_deleted: false,
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    ...(isActive === "true" || isActive === "false" ? { isActive: isActive === "true" } : {}),
    ...(licenseId ? { licenseId } : {}),
  };

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({ where, include: ORGANIZATION_INCLUDE, orderBy: page.orderBy, skip: page.skip, take: page.take }),
    prisma.organization.count({ where }),
  ]);

  return ok(paginated(organizations.map(serializeOrganization), total, page));
});

export const POST = withRoute(async (request) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);

  const body = await request.json();
  assert(typeof body?.name === "string" && body.name.trim().length > 0, "name is required");

  await assertLicenseUsable(body.licenseId);
  await assertLicenseAvailable(body.licenseId);
  const created = await prisma.organization.create({ data: { name: body.name.trim(), licenseId: body.licenseId }, include: ORGANIZATION_INCLUDE });

  await writeAuditLog({
    organizationId: created.id,
    performedByUserId: user.id,
    action: "CREATE_ORGANIZATION",
    metadata: { target: { table: "Organization", id: created.id } },
  });

  return ok(serializeOrganization(created), "Organization created successfully.", 201, "ORGANIZATION_CREATED");
});
