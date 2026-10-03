import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";
import { validateLicenseBody, serializeLicenses } from "@/lib/license";
import { parsePagination, paginated } from "@/lib/pagination";

export const runtime = "nodejs";

export const GET = withRoute(async (request) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);

  const params = request.nextUrl.searchParams;
  const page = parsePagination(params, ["createdAt", "name", "maxDevice"]);
  const search = params.get("search")?.trim();
  const where = { is_deleted: false, ...(search ? { name: { contains: search, mode: "insensitive" } } : {}) };

  const [licenses, total] = await Promise.all([
    prisma.license.findMany({ where, orderBy: page.orderBy, skip: page.skip, take: page.take }),
    prisma.license.count({ where }),
  ]);

  return ok(paginated(await serializeLicenses(prisma, licenses), total, page));
});

export const POST = withRoute(async (request) => {
  const user = await getAuthUser(request);
  requireRole(user, ["SUPERADMIN"]);

  const data = validateLicenseBody(await request.json());
  const created = await prisma.license.create({ data });

  await writeAuditLog({
    performedByUserId: user.id,
    action: "CREATE_LICENSE",
    metadata: { target: { table: "License", id: created.id } },
  });

  return ok((await serializeLicenses(prisma, [created]))[0], "License created successfully.", 201, "LICENSE_CREATED");
});
