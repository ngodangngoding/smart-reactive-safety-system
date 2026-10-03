
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export const DEFAULT_BUSINESS_TIME_ZONE = "Asia/Jakarta";

export function isDateOnly(value) {
  if (typeof value !== "string") return false;
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function addDays(dateOnly, days) {
  const [y, m, d] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function todayInTimeZone(timeZone = DEFAULT_BUSINESS_TIME_ZONE, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export const toDateOnly = (date) => date.toISOString().slice(0, 10);
export const fromDateOnly = (dateOnly) => new Date(`${dateOnly}T00:00:00.000Z`);

export function licenseStatus({ startDate, endDate }, today) {
  if (today < startDate) return "not_started";
  if (today > endDate) return "expired";
  return "active";
}

function fieldError(field, message) {
  return { field, message };
}

export function findLicensePeriodError({ startDate, endDate, existing = null, today }) {
  if (startDate === undefined || startDate === null || startDate === "") return fieldError("startDate", "Start date is required");
  if (endDate === undefined || endDate === null || endDate === "") return fieldError("endDate", "End date is required");
  if (!isDateOnly(startDate)) return fieldError("startDate", "Start date must be a valid date (YYYY-MM-DD)");
  if (!isDateOnly(endDate)) return fieldError("endDate", "End date must be a valid date (YYYY-MM-DD)");

  if ((!existing || startDate !== existing.startDate) && startDate < today) {
    return fieldError("startDate", "Start date cannot be before today");
  }
  if (endDate < addDays(startDate, 1)) {
    return fieldError("endDate", "End date must be at least 1 day after the start date");
  }
  if (existing && endDate !== existing.endDate && licenseStatus(existing, today) === "expired" && endDate < today) {
    return fieldError("endDate", "Renewing an expired license needs an end date of today or later");
  }
  return null;
}
