import { format } from "date-fns";
import { addDays, findLicensePeriodError } from "@/lib/licensePeriod.js";

export const todayLocal = () => format(new Date(), "yyyy-MM-dd");

export function validateLicenseDates(values, existing = null) {
  const problem = findLicensePeriodError({ startDate: values.startDate, endDate: values.endDate, existing, today: todayLocal() });
  return problem ? { [problem.field]: problem.message } : {};
}

export function dateBounds(values, existing = null) {
  const today = todayLocal();
  const startMin = existing && existing.startDate < today ? existing.startDate : today;
  const endMin = addDays(/^\d{4}-\d{2}-\d{2}$/.test(values.startDate) ? values.startDate : today, 1);
  return { startMin, endMin };
}
