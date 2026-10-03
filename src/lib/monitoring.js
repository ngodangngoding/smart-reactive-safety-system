import { LOW_BATTERY_PERCENT, isStale } from "@/lib/telemetryThresholds";
import { stripDeleted } from "@/lib/softDelete";

export function computeMonitoringStatus({ workerNode, latestTelemetry, activeIncident }) {
  if (!workerNode) return "NO_DEVICE";
  if (activeIncident) return "SOS";
  if (!workerNode.isActive || !latestTelemetry || isStale(latestTelemetry.receivedAt)) return "OFFLINE";
  if (latestTelemetry.batteryPercent <= LOW_BATTERY_PERCENT) return "LOW_BATTERY";
  return "ONLINE";
}

export async function loadMonitoringEntry(client, rawWorker) {
  const worker = stripDeleted(rawWorker, ["workerNode", "organization"]);
  const workerNode = worker.workerNode;

  let latestTelemetry = null;
  let activeIncident = null;
  if (workerNode) {
    [latestTelemetry, activeIncident] = await Promise.all([
      client.telemetry.findFirst({ where: { workerNodeId: workerNode.id, is_deleted: false }, orderBy: { receivedAt: "desc" } }),
      client.incident.findFirst({ where: { workerNodeId: workerNode.id, status: "ACTIVE", is_deleted: false } }),
    ]);
  }

  return { worker, workerNode, latestTelemetry, activeIncident, status: computeMonitoringStatus({ workerNode, latestTelemetry, activeIncident }) };
}
