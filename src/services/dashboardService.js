import api from "@/services/apiService.js";
import { withOrganizationId } from "@/services/organizationParams.js";

export const getMonitoring = async (organizationId) => {
  try {
    const response = await api.get("/monitoring", { params: withOrganizationId({}, organizationId) });

    if (response.data?.status === "success") {
      return response.data.data;
    }

    throw new Error(response.data?.message || "Failed to fetch monitored workers");
  } catch (error) {
    console.error("Error fetching monitored workers:", error);
    throw error;
  }
};

export const getWorkerMonitoring = async (workerId) => {
  try {
    const response = await api.get(`/monitoring/${workerId}`);

    if (response.data?.status === "success") {
      return response.data.data;
    }

    throw new Error(response.data?.message || "Failed to fetch worker monitoring detail");
  } catch (error) {
    console.error("Error fetching worker monitoring detail:", error);
    throw error;
  }
};

import { OFFLINE_AFTER_MINUTES, LOW_BATTERY_PERCENT } from "@/lib/telemetryThresholds.js";

export const STATE_META = {
  EMERGENCY: { label: "Emergency", variant: "danger" },
  LOW_BATTERY: { label: "Low Battery", variant: "warning" },
  OFFLINE: { label: "Offline", variant: "gray" },
  UNASSIGNED: { label: "No Device", variant: "gray" },
  NORMAL: { label: "Normal", variant: "success" },
};

export function deriveWorkerStatus({ worker, workerNode, latestTelemetry, activeIncident }) {
  if (!workerNode) {
    return { state: "UNASSIGNED", connection: "offline", lastUpdateAt: null };
  }

  const minutesSinceUpdate = latestTelemetry
    ? (Date.now() - new Date(latestTelemetry.receivedAt).getTime()) / 60000
    : Infinity;
  const connection = workerNode.isActive && minutesSinceUpdate <= OFFLINE_AFTER_MINUTES ? "online" : "offline";

  let state = "NORMAL";
  if (activeIncident) state = "EMERGENCY";
  else if (connection === "offline") state = "OFFLINE";
  else if (latestTelemetry && latestTelemetry.batteryPercent <= LOW_BATTERY_PERCENT) state = "LOW_BATTERY";

  return { state, connection, lastUpdateAt: latestTelemetry?.receivedAt ?? null };
}

export function summarizeMonitoring(entries) {
  const withNode = entries.filter((entry) => entry.worker.workerNode);
  let emergency = 0;
  let online = 0;
  let offline = 0;

  for (const entry of withNode) {
    const { state, connection } = deriveWorkerStatus({
      worker: entry.worker,
      workerNode: entry.worker.workerNode,
      latestTelemetry: entry.latestTelemetry,
      activeIncident: entry.activeIncident,
    });
    if (state === "EMERGENCY") emergency += 1;
    if (connection === "online") online += 1;
    else offline += 1;
  }

  return { emergency, totalActive: withNode.length, online, offline };
}

export const getDashboardSummary = async (organizationId) => {
  try {
    const response = await api.get("/dashboard/summary", { params: withOrganizationId({}, organizationId) });
    if (response.data?.status === "success") return response.data.data;
    throw new Error(response.data?.message || "Failed to fetch dashboard summary");
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    throw error;
  }
};
