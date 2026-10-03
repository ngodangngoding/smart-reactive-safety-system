import prisma from "@/lib/prisma";
import { ValidationError, AuthError, ConflictError } from "@/lib/errors";
import { config } from "@/lib/config";
import { findLicensePeriodError, fromDateOnly, licenseStatus, todayInTimeZone, toDateOnly } from "@/lib/licensePeriod";

export const businessToday = () => todayInTimeZone(config.businessTimeZone);

export function licensePeriod(license, today = businessToday()) {
  const period = { startDate: toDateOnly(license.startDate), endDate: toDateOnly(license.endDate) };
  return { ...period, status: licenseStatus(period, today) };
}

export async function assertOrganizationOperational(client, organizationId) {
  const organization = organizationId
    ? await client.organization.findFirst({ where: { id: organizationId }, include: { license: true } })
    : null;

  if (!organization || organization.is_deleted || !organization.isActive) {
    throw new AuthError("Organization is not active", 403, "ORG_INACTIVE");
  }
  const license = organization.license;
  if (!organization.licenseId || !license || license.is_deleted) {
    throw new AuthError("Organization has no valid license", 403, "ORG_LICENSE_INVALID");
  }
  const { status } = licensePeriod(license);
  if (status === "expired") throw new AuthError("Your organization's license has expired.", 403, "LICENSE_EXPIRED");
  if (status === "not_started") throw new AuthError("Your organization's license has not started yet.", 403, "LICENSE_NOT_STARTED");
  return { organization, license };
}

export async function getDeviceUsage(client, organizationId) {
  const [used, organization] = await Promise.all([
    client.workerNode.count({ where: { organizationId, is_deleted: false } }),
    client.organization.findFirst({ where: { id: organizationId }, select: { license: { select: { maxDevice: true, is_deleted: true } } } }),
  ]);
  const license = organization?.license;
  return { used, max: license && !license.is_deleted ? license.maxDevice : 0 };
}

export async function assertDeviceQuota(tx, organizationId) {
  const { used, max } = await getDeviceUsage(tx, organizationId);
  if (used >= max) {
    throw new ConflictError("Device quota of the license has been reached", "LICENSE_QUOTA_EXCEEDED", { used, max });
  }
}

export async function assertLicenseUsable(licenseId) {
  const license = typeof licenseId === "string" && licenseId ? await prisma.license.findFirst({ where: { id: licenseId, is_deleted: false } }) : null;
  if (!license) throw new ValidationError("A valid licenseId is required");
  return license;
}

export async function assertLicenseAvailable(licenseId, excludeOrganizationId = null) {
  const taken = await prisma.organization.findFirst({
    where: { licenseId, is_deleted: false, ...(excludeOrganizationId ? { id: { not: excludeOrganizationId } } : {}) },
    select: { id: true, name: true },
  });
  if (taken) throw new ConflictError(`License is already assigned to ${taken.name}`, "LICENSE_ALREADY_ASSIGNED", { organization: taken });
}

export async function assertLicenseFitsOrganization(license, organizationId) {
  const { used } = await getDeviceUsage(prisma, organizationId);
  if (used > license.maxDevice) {
    throw new ConflictError("License quota is below this organization's device usage", "LICENSE_QUOTA_BELOW_USAGE", {
      organizations: [{ id: organizationId, used, max: license.maxDevice }],
    });
  }
}

export async function assertQuotaCoversUsage(licenseId, maxDevice) {
  const organizations = await prisma.organization.findMany({ where: { licenseId, is_deleted: false }, select: { id: true, name: true } });
  const usage = await Promise.all(
    organizations.map(async (organization) => ({ ...organization, used: (await getDeviceUsage(prisma, organization.id)).used }))
  );
  const over = usage.filter((organization) => organization.used > maxDevice);
  if (over.length > 0) {
    throw new ConflictError("maxDevice is below the current device usage of some organizations", "LICENSE_QUOTA_BELOW_USAGE", { organizations: over });
  }
}

export async function getOrganizationSummary(client, organizationId) {
  if (!organizationId) return null;
  const organization = await client.organization.findFirst({
    where: { id: organizationId, is_deleted: false },
    select: { id: true, name: true, license: { select: { id: true, name: true, maxDevice: true, startDate: true, endDate: true, is_deleted: true } } },
  });
  if (!organization) return null;
  const { license } = organization;
  return {
    id: organization.id,
    name: organization.name,
    license: license && !license.is_deleted ? { id: license.id, name: license.name, maxDevice: license.maxDevice, ...licensePeriod(license) } : null,
    deviceUsage: await getDeviceUsage(client, organizationId),
  };
}

export function validateLicenseBody(body, existing = null) {
  const partial = existing !== null;
  const data = {};
  if (!partial || body?.name !== undefined) {
    if (!(typeof body?.name === "string" && body.name.trim().length > 0)) throw new ValidationError("name is required", "VALIDATION_ERROR", { fields: { name: "name is required" } });
    data.name = body.name.trim();
  }
  if (!partial || body?.maxDevice !== undefined) {
    if (!(Number.isInteger(body?.maxDevice) && body.maxDevice >= 1)) {
      throw new ValidationError("maxDevice must be a whole number of 1 or more", "VALIDATION_ERROR", { fields: { maxDevice: "maxDevice must be a whole number of 1 or more" } });
    }
    data.maxDevice = body.maxDevice;
  }
  if (!partial || body?.startDate !== undefined || body?.endDate !== undefined) {
    const stored = partial ? { startDate: toDateOnly(existing.startDate), endDate: toDateOnly(existing.endDate) } : null;
    const startDate = body?.startDate !== undefined ? body.startDate : stored?.startDate;
    const endDate = body?.endDate !== undefined ? body.endDate : stored?.endDate;
    const problem = findLicensePeriodError({ startDate, endDate, existing: stored, today: businessToday() });
    if (problem) throw new ValidationError(problem.message, "VALIDATION_ERROR", { fields: { [problem.field]: problem.message } });
    data.startDate = fromDateOnly(startDate);
    data.endDate = fromDateOnly(endDate);
  }
  return data;
}

export async function deviceUsedByOrganization(client, organizationIds) {
  if (organizationIds.length === 0) return {};
  const rows = await client.workerNode.groupBy({
    by: ["organizationId"],
    where: { organizationId: { in: organizationIds }, is_deleted: false },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((row) => [row.organizationId, row._count._all]));
}

export async function serializeLicenses(client, licenses) {
  const organizations = await client.organization.findMany({
    where: { licenseId: { in: licenses.map((l) => l.id) }, is_deleted: false },
    select: { id: true, name: true, licenseId: true },
  });
  const used = await deviceUsedByOrganization(client, organizations.map((o) => o.id));

  const today = businessToday();
  return licenses.map((license) => ({
    id: license.id,
    name: license.name,
    maxDevice: license.maxDevice,
    ...licensePeriod(license, today),
    organizations: organizations.filter((o) => o.licenseId === license.id).map((o) => ({ id: o.id, name: o.name, deviceUsed: used[o.id] ?? 0 })),
    createdAt: license.createdAt,
    updatedAt: license.updatedAt,
  }));
}
