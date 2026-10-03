import test from "node:test";
import assert from "node:assert/strict";

import { addDays, findLicensePeriodError, isDateOnly, licenseStatus, todayInTimeZone } from "../src/lib/licensePeriod.js";

const today = "2026-10-03";
const problem = (input) => findLicensePeriodError({ today, ...input })?.field ?? null;

test("create: both dates are required", () => {
  assert.equal(problem({ endDate: "2026-10-05" }), "startDate");
  assert.equal(problem({ startDate: "2026-10-03" }), "endDate");
  assert.equal(problem({ startDate: "", endDate: "" }), "startDate");
});

test("create: start may be today or later, never earlier", () => {
  assert.equal(problem({ startDate: "2026-10-02", endDate: "2026-10-05" }), "startDate");
  assert.equal(problem({ startDate: "2026-10-03", endDate: "2026-10-04" }), null);
  assert.equal(problem({ startDate: "2026-10-04", endDate: "2026-10-05" }), null);
});

test("end must be at least one day after start", () => {
  assert.equal(problem({ startDate: "2026-10-03", endDate: "2026-10-03" }), "endDate");
  assert.equal(problem({ startDate: "2026-10-04", endDate: "2026-10-03" }), "endDate");
  assert.equal(problem({ startDate: "2026-10-03", endDate: "2026-10-04" }), null);
});

test("rejects malformed and impossible dates", () => {
  assert.equal(isDateOnly("2026-02-30"), false);
  assert.equal(isDateOnly("2026-10-03T00:00:00Z"), false);
  assert.equal(isDateOnly(20261003), false);
  assert.equal(problem({ startDate: "2026-13-01", endDate: "2026-10-05" }), "startDate");
});

test("edit: an old unchanged start is kept; a changed start must be today or later", () => {
  const existing = { startDate: "2026-01-01", endDate: "2026-10-02" };
  assert.equal(problem({ existing, startDate: "2026-01-01", endDate: "2026-12-31" }), null);
  assert.equal(problem({ existing, startDate: "2026-02-01", endDate: "2026-12-31" }), "startDate");
  assert.equal(problem({ existing, startDate: "2026-10-03", endDate: "2026-12-31" }), null);
});

test("edit: renewing an expired license needs an end date of today or later", () => {
  const existing = { startDate: "2026-01-01", endDate: "2026-10-02" };
  assert.equal(licenseStatus(existing, today), "expired");
  assert.equal(problem({ existing, startDate: "2026-01-01", endDate: "2026-10-02" }), null); // untouched
  assert.equal(problem({ existing, startDate: "2026-01-01", endDate: "2026-10-01" }), "endDate");
  assert.equal(problem({ existing, startDate: "2026-01-01", endDate: "2026-10-03" }), null);
});

test("status: active through the whole end date", () => {
  const period = { startDate: "2026-10-03", endDate: "2026-10-05" };
  assert.equal(licenseStatus(period, "2026-10-02"), "not_started");
  assert.equal(licenseStatus(period, "2026-10-03"), "active");
  assert.equal(licenseStatus(period, "2026-10-05"), "active");
  assert.equal(licenseStatus(period, "2026-10-06"), "expired");
});

test("addDays and business-zone today are calendar-based", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  // 2026-10-03 20:00 UTC is already Oct 4 in Jakarta (UTC+7), still Oct 3 in UTC.
  const instant = new Date("2026-10-03T20:00:00Z");
  assert.equal(todayInTimeZone("Asia/Jakarta", instant), "2026-10-04");
  assert.equal(todayInTimeZone("UTC", instant), "2026-10-03");
});
