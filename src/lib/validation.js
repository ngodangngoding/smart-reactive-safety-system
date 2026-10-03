import { ValidationError } from "@/lib/errors";

export function assert(condition, message) {
  if (!condition) throw new ValidationError(message);
}

export function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function isValidLatitude(value) {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value) {
  return isFiniteNumber(value) && value >= -180 && value <= 180;
}
