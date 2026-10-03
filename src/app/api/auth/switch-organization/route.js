import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, requireRole } from "@/lib/auth";
import { issueTokens } from "@/lib/tokens";
import { assertOrganizationOperational } from "@/lib/license";
import { writeAuditLog } from "@/lib/auditLog";
import { assert } from "@/lib/validation";

export const runtime = "nodejs";

export const POST = withRoute(async (request) => {
  const user = await getAuthUser(request, { skipActingCheck: true });
  requireRole(user, ["SUPERADMIN"]);

  const body = await request.json();
  const target = body?.organizationId ?? null;
  assert(target === null || (typeof target === "string" && target.length > 0), "organizationId must be a string or null");

  let organization = null;
  if (target) ({ organization } = await assertOrganizationOperational(prisma, target));

  await writeAuditLog({
    organizationId: target,
    performedByUserId: user.id,
    action: "SWITCH_ORGANIZATION",
    metadata: { target: { table: "Organization", id: target }, from: user.actingOrganizationId },
  });

  return ok(issueTokens(user, { actingOrganizationId: target }), organization ? `Now acting as ${organization.name}` : "Left organization mode");
});
