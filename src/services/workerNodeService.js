import api, { unwrap, unwrapMutation } from "@/services/apiService.js";

export const getWorkerNodes = async (params = {}) => {
  try {
    return unwrap(await api.get("/worker-nodes", { params }), "Failed to fetch worker nodes");
  } catch (error) {
    console.error("Error fetching worker nodes:", error);
    throw error;
  }
};

export const getWorkerNode = async (id) => {
  try {
    return unwrap(await api.get(`/worker-nodes/${id}`), "Failed to fetch worker node");
  } catch (error) {
    console.error("Error fetching worker node:", error);
    throw error;
  }
};

export const registerWorkerNode = async (data) => {
  try {
    return unwrapMutation(await api.post("/worker-nodes", data), "Failed to register worker node");
  } catch (error) {
    console.error("Error registering worker node:", error);
    throw error;
  }
};

export const updateWorkerNode = async (id, data) => {
  try {
    return unwrapMutation(await api.patch(`/worker-nodes/${id}`, data), "Failed to update worker node");
  } catch (error) {
    console.error("Error updating worker node:", error);
    throw error;
  }
};

export const deleteWorkerNode = async (id) => {
  try {
    return unwrapMutation(await api.delete(`/worker-nodes/${id}`), "Failed to delete worker node");
  } catch (error) {
    console.error("Error deleting worker node:", error);
    throw error;
  }
};

export const getTelemetryHistory = async (workerNodeId, limit = 20) => {
  try {
    return unwrap(await api.get("/telemetry", { params: { workerNodeId, limit } }), "Failed to fetch telemetry history").reverse();
  } catch (error) {
    console.error("Error fetching telemetry history:", error);
    throw error;
  }
};

export const getTelemetryRange = async (workerNodeId, from, to) => {
  try {
    return unwrap(
      await api.get("/telemetry", { params: { workerNodeId, from: new Date(from).toISOString(), to: new Date(to).toISOString() } }),
      "Failed to fetch telemetry"
    );
  } catch (error) {
    console.error("Error fetching telemetry range:", error);
    throw error;
  }
};

export const getLatestTelemetry = async (workerNodeId) => {
  try {
    return unwrap(await api.get("/telemetry/latest", { params: { workerNodeId } }), "Failed to fetch latest telemetry");
  } catch (error) {
    console.error("Error fetching latest telemetry:", error);
    throw error;
  }
};

export const getWorkerNodeDeletePreview = async (id) => {
  try {
    return unwrap(await api.get(`/worker-nodes/${id}/delete-preview`), "Failed to load delete preview");
  } catch (error) {
    console.error("Error loading delete preview:", error);
    throw error;
  }
};
