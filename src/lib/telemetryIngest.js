import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { ok } from "@/lib/apiResponse";
import { config } from "@/lib/config";
import { redis } from "@/lib/redis";
import { writeAuditLog } from "@/lib/auditLog";
import { assertOrganizationOperational } from "@/lib/license";
import { isFiniteNumber, isValidLatitude, isValidLongitude } from "@/lib/validation";
import { ApiError, AuthError, ValidationError } from "@/lib/errors";

const FLOAT_FIELDS = [
  "sequence", "accel_y", "timestamp", "temperature", "gyro_z", "satellites",
  "altitude", "battery_percent", "humidity", "gyro_x", "pressure",
  "battery_voltage", "accel_x", "accel_z", "gyro_y",
];

const unauthorized = () => new AuthError("Webhook authentication failed", 401, "WEBHOOK_UNAUTHORIZED");

function safeEqual(a, b) {
  const digest = (value) => crypto.createHash("sha256").update(String(value)).digest();
  return crypto.timingSafeEqual(digest(a), digest(b));
}

function authenticate(pathToken) {
  const { secret } = config.telemetryWebhook;
  if (!secret) {
    console.error("TELEMETRY_WEBHOOK_SECRET is not set; rejecting all webhook requests");
    throw unauthorized();
  }
  if (!pathToken || !safeEqual(pathToken, secret)) throw unauthorized();
}

function extractItems(parsed) {
  const unwrap = (item) => (item && typeof item === "object" && item.type === "telemetry" && item.data && typeof item.data === "object" && !Array.isArray(item.data) ? item.data : item);

  if (Array.isArray(parsed)) return { items: parsed.map(unwrap), batch: true };
  if (Array.isArray(parsed?.data)) return { items: parsed.data.map(unwrap), batch: true };
  return { items: [unwrap(parsed)], batch: false };
}

function validatePayload(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return "payload must be an object";
  if (!isFiniteNumber(item.worker_id)) return "worker_id must be a number";
  if (typeof item.sos !== "boolean") return "sos must be a boolean";
  if (!isValidLatitude(item.latitude)) return "latitude must be a valid number between -90 and 90";
  if (!isValidLongitude(item.longitude)) return "longitude must be a valid number between -180 and 180";
  for (const field of FLOAT_FIELDS) {
    if (!isFiniteNumber(item[field])) return `${field} must be a number`;
  }
  return null;
}

async function persist(node, body) {
  return prisma.$transaction(async (tx) => {
    const telemetry = await tx.telemetry.create({
      data: {
        workerNodeId: node.id,
        sequence: body.sequence,
        accelY: body.accel_y,
        longitude: body.longitude,
        deviceTimestamp: body.timestamp,
        temperature: body.temperature,
        sos: body.sos,
        gyroZ: body.gyro_z,
        latitude: body.latitude,
        satellites: body.satellites,
        altitude: body.altitude,
        batteryPercent: body.battery_percent,
        humidity: body.humidity,
        gyroX: body.gyro_x,
        pressure: body.pressure,
        batteryVoltage: body.battery_voltage,
        accelX: body.accel_x,
        accelZ: body.accel_z,
        gyroY: body.gyro_y,
      },
    });

    let incident = null;
    let incidentCreated = false;
    if (body.sos) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${node.id}))`;
      incident = await tx.incident.findFirst({ where: { workerNodeId: node.id, status: "ACTIVE", is_deleted: false } });

      if (!incident) {
        incident = await tx.incident.create({
          data: {
            organizationId: node.organizationId,
            workerNodeId: node.id,
            workerId: node.workerId,
            status: "ACTIVE",
            triggerTelemetryId: telemetry.id,
            latitude: body.latitude,
            longitude: body.longitude,
            altitude: body.altitude,
            satellites: body.satellites,
          },
        });
        incidentCreated = true;

        await writeAuditLog(
          { organizationId: node.organizationId, action: "CREATE_INCIDENT", metadata: { target: { table: "Incident", id: incident.id }, triggerTelemetryId: telemetry.id } },
          tx
        );
      }
    }

    return { telemetryId: telemetry.id, incidentId: incident?.id ?? null, incidentCreated, duplicate: false };
  });
}

async function processItem(item) {
  const problem = validatePayload(item);
  if (problem) throw new ValidationError(problem);

  const dedupeKey = `tlm:dedupe:${item.worker_id}:${item.sequence}:${item.timestamp}`;
  const fresh = await redis.setNxEx(dedupeKey, config.telemetryWebhook.dedupeTtlSeconds, "1");
  if (!fresh) return { duplicate: true };

  try {
    const node = await prisma.workerNode.findFirst({
      where: { deviceWorkerId: item.worker_id, is_deleted: false },
      include: { worker: { select: { is_deleted: true, isActive: true } } },
    });
    if (!node) throw new ApiError("Unknown Worker Node", 404, "DEVICE_NOT_REGISTERED");
    if (!node.isActive || !node.worker || node.worker.is_deleted || !node.worker.isActive) {
      throw new AuthError("Worker Node is not active", 403, "DEVICE_INACTIVE");
    }
    await assertOrganizationOperational(prisma, node.organizationId);

    return await persist(node, item);
  } catch (error) {
    await redis.del(dedupeKey).catch(() => {});
    throw error;
  }
}

export async function handleTelemetryRequest(request, pathToken) {
  authenticate(pathToken);
  const rawBody = await request.text();

  let parsed;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new ValidationError("Request body is not valid JSON");
  }

  const { items, batch } = extractItems(parsed);
  if (items.length === 0) throw new ValidationError("No telemetry payload received");
  if (items.length > config.telemetryWebhook.maxBatch) {
    throw new ApiError(`Batch exceeds ${config.telemetryWebhook.maxBatch} items`, 413, "PAYLOAD_TOO_LARGE");
  }

  if (!batch) {
    const result = await processItem(items[0]);
    return result.duplicate ? ok({ duplicate: true }, "Duplicate reading ignored") : ok(result, "Telemetry ingested", 201);
  }

  let accepted = 0;
  let duplicates = 0;
  const rejected = [];
  for (const [index, item] of items.entries()) {
    try {
      const result = await processItem(item);
      if (result.duplicate) duplicates += 1;
      else accepted += 1;
    } catch (error) {
      if (!(error instanceof ApiError)) console.error("Telemetry batch item failed:", error);
      rejected.push({ index, worker_id: item?.worker_id ?? null, code: error instanceof ApiError ? error.code : "INTERNAL_ERROR", message: error instanceof ApiError ? error.message : "Internal server error" });
    }
  }

  return ok({ received: items.length, accepted, duplicates, rejected }, "Batch processed");
}
