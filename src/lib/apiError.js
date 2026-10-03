export const GENERIC_ERROR = "Something went wrong. Please try again.";

export function apiErrorMessage(error, fallback = GENERIC_ERROR) {
  const body = error?.response?.data;
  let message = body?.message || fallback;
  const organizations = body?.data?.organizations;
  if (Array.isArray(organizations) && organizations.length > 0) {
    message += `: ${organizations.map((org) => (org.used !== undefined ? `${org.name} (${org.used} devices)` : org.name)).join(", ")}`;
  }
  return message;
}

export function applyFieldErrors(error, helpers, values) {
  const data = error?.response?.data;
  const fields = data?.data?.fields;
  if (fields && Object.keys(fields).length > 0) {
    helpers.setErrors(fields);
    return true;
  }
  const duplicate = data?.data?.code === "DUPLICATE" && data.data.field;
  if (duplicate && duplicate in values) {
    helpers.setFieldError(duplicate, "Already in use");
    return true;
  }
  return false;
}
