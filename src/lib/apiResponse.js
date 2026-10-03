import { NextResponse } from "next/server";
import { ApiError } from "@/lib/errors";

const HIDDEN_KEYS = new Set(["passwordHash", "tokenVersion", "is_deleted", "deletedAt", "archivedDeviceWorkerId", "archivedWorkerId"]);

function toClient(value) {
  if (Array.isArray(value)) return value.map(toClient);
  if (value === null || typeof value !== "object" || value instanceof Date) return value;
  if (typeof value.toNumber === "function") return value.toNumber();

  const result = {};
  for (const [key, inner] of Object.entries(value)) {
    if (!HIDDEN_KEYS.has(key)) result[key] = toClient(inner);
  }
  return result;
}

export function ok(data = null, message = "Success", status = 200, code = undefined) {
  return NextResponse.json({ status: "success", message, ...(code ? { code } : {}), data: toClient(data) }, { status });
}

export function fail(message, status = 400, data = null) {
  const code = data?.code;
  return NextResponse.json({ status: "error", message, ...(code ? { code } : {}), data }, { status });
}

function duplicateField(error) {
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.join(", ");
  if (typeof target === "string") return target;
  const index = error.meta?.driverAdapterError?.cause?.constraint?.index;
  const model = error.meta?.modelName;
  if (typeof index === "string" && model) return index.replace(`${model}_`, "").replace(/_key$/, "");
  return "field";
}

export function withRoute(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        const data = error.code || error.data ? { code: error.code, ...error.data } : null;
        return fail(error.message, error.status, data);
      }
      if (error?.code === "P2002") {
        const field = duplicateField(error);
        return fail(`This ${field} is already in use.`, 409, { code: "DUPLICATE", field });
      }
      if (error?.code === "P2025") {
        return fail("The requested record was not found.", 404, { code: "NOT_FOUND" });
      }
      console.error(error);
      return fail("Unable to complete the request. Please try again.", 500, { code: "INTERNAL_ERROR" });
    }
  };
}
