import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { withRoute, ok } from "@/lib/apiResponse";
import { getAuthUser, organizationScope, assertOrganizationAccess } from "@/lib/auth";
import { getDeviceUsage } from "@/lib/license";
import { OFFLINE_AFTER_MINUTES } from "@/lib/telemetryThresholds";

export const runtime = "nodejs";

export const GET = withRoute(async (request) => {
  const user = await getAuthUser(request);
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (organizationId) assertOrganizationAccess(user, organizationId);
  const scope = { ...organizationScope(user), ...(organizationId ? { organizationId } : {}) };
  const scoped = Boolean(scope.organizationId);
  const live = { is_deleted: false };

  const orgFilter = scoped ? Prisma.sql`AND n."organizationId" = ${scope.organizationId}::uuid` : Prisma.empty;
  const [connection] = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS total,
      (COUNT(*) FILTER (WHERE t."receivedAt" > now() - make_interval(mins => ${OFFLINE_AFTER_MINUTES})))::int AS online
    FROM "WorkerNode" n
    LEFT JOIN LATERAL (
      SELECT "receivedAt" FROM "Telemetry"
      WHERE "workerNodeId" = n.id AND is_deleted = false
      ORDER BY "receivedAt" DESC LIMIT 1
    ) t ON true
    WHERE n.is_deleted = false AND n."isActive" = true ${orgFilter}`;

  const [workers, workerNodes, activeIncidents] = await Promise.all([
    prisma.worker.count({ where: { ...live, ...scope } }),
    prisma.workerNode.count({ where: { ...live, ...scope } }),
    prisma.incident.count({ where: { ...live, ...scope, status: "ACTIVE" } }),
  ]);

  let deviceUsage;
  let organizations;
  if (scoped) {
    deviceUsage = await getDeviceUsage(prisma, scope.organizationId);
  } else {
    const orgs = await prisma.organization.findMany({
      where: { ...live, isActive: true },
      select: { license: { select: { maxDevice: true, is_deleted: true } } },
    });
    organizations = orgs.length;
    deviceUsage = { used: workerNodes, max: orgs.reduce((sum, org) => sum + (org.license && !org.license.is_deleted ? org.license.maxDevice : 0), 0) };
  }

  return ok({
    workers,
    workerNodes,
    online: connection.online,
    offline: connection.total - connection.online,
    activeIncidents,
    deviceUsage,
    ...(organizations !== undefined ? { organizations } : {}),
  });
});
