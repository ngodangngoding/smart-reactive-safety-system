import api, { unwrap, unwrapMutation } from "@/services/apiService.js";

export const getIncidents = async (params = {}) => {
  try {
    return unwrap(await api.get("/incidents", { params }), "Failed to fetch incidents");
  } catch (error) {
    console.error("Error fetching incidents:", error);
    throw error;
  }
};

export const getIncident = async (id) => {
  try {
    return unwrap(await api.get(`/incidents/${id}`), "Failed to fetch incident");
  } catch (error) {
    console.error("Error fetching incident:", error);
    throw error;
  }
};

export const resolveIncident = async (incidentId, note) => {
  try {
    return unwrapMutation(await api.post(`/incidents/${incidentId}/resolve`, note ? { note } : {}), "Failed to resolve incident");
  } catch (error) {
    console.error("Error resolving incident:", error);
    throw error;
  }
};

export const deleteIncident = async (incidentId) => {
  try {
    return unwrapMutation(await api.delete(`/incidents/${incidentId}`), "Failed to delete incident");
  } catch (error) {
    console.error("Error deleting incident:", error);
    throw error;
  }
};
