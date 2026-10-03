import prisma from "@/lib/prisma";

export async function writeAuditLog({ organizationId = null, performedByUserId = null, action, metadata = null }, client = prisma) {
  await client.auditLog.create({
    data: { organizationId, performedByUserId, action, metadata },
  });
}
