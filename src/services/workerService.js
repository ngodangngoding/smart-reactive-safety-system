import api, { unwrap, unwrapMutation } from "@/services/apiService.js";

export const getWorkers = async (params = {}) => {
  try {
    return unwrap(await api.get("/workers", { params }), "Failed to fetch workers");
  } catch (error) {
    console.error("Error fetching workers:", error);
    throw error;
  }
};

export const getWorker = async (id) => {
  try {
    return unwrap(await api.get(`/workers/${id}`), "Failed to fetch worker");
  } catch (error) {
    console.error("Error fetching worker:", error);
    throw error;
  }
};

export const createWorker = async (data) => {
  try {
    return unwrapMutation(await api.post("/workers", data), "Failed to create worker");
  } catch (error) {
    console.error("Error creating worker:", error);
    throw error;
  }
};

export const updateWorker = async (id, data) => {
  try {
    return unwrapMutation(await api.patch(`/workers/${id}`, data), "Failed to update worker");
  } catch (error) {
    console.error("Error updating worker:", error);
    throw error;
  }
};

export const deleteWorker = async (id) => {
  try {
    return unwrapMutation(await api.delete(`/workers/${id}`), "Failed to delete worker");
  } catch (error) {
    console.error("Error deleting worker:", error);
    throw error;
  }
};

export const getWorkerOptions = async (params = {}) => {
  try {
    return unwrap(await api.get("/workers/options", { params }), "Failed to fetch worker options");
  } catch (error) {
    console.error("Error: Failed to fetch worker options", error);
    throw error;
  }
};

export const getWorkerDeletePreview = async (id) => {
  try {
    return unwrap(await api.get(`/workers/${id}/delete-preview`), "Failed to load delete preview");
  } catch (error) {
    console.error("Error loading delete preview:", error);
    throw error;
  }
};
