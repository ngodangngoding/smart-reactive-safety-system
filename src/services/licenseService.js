import api, { unwrap, unwrapMutation } from "@/services/apiService.js";

export const getLicenses = async (params = {}) => {
  try {
    return unwrap(await api.get("/licenses", { params }), "Failed to fetch licenses");
  } catch (error) {
    console.error("Error fetching licenses:", error);
    throw error;
  }
};

export const getLicense = async (id) => {
  try {
    return unwrap(await api.get(`/licenses/${id}`), "Failed to fetch license");
  } catch (error) {
    console.error("Error fetching license:", error);
    throw error;
  }
};

export const createLicense = async (data) => {
  try {
    return unwrapMutation(await api.post("/licenses", data), "Failed to create license");
  } catch (error) {
    console.error("Error creating license:", error);
    throw error;
  }
};

export const updateLicense = async (id, data) => {
  try {
    return unwrapMutation(await api.patch(`/licenses/${id}`, data), "Failed to update license");
  } catch (error) {
    console.error("Error updating license:", error);
    throw error;
  }
};

export const deleteLicense = async (id) => {
  try {
    return unwrapMutation(await api.delete(`/licenses/${id}`), "Failed to delete license");
  } catch (error) {
    console.error("Error deleting license:", error);
    throw error;
  }
};

export const getLicenseOptions = async (params = {}) => {
  try {
    return unwrap(await api.get("/licenses/options", { params }), "Failed to fetch license options");
  } catch (error) {
    console.error("Error: Failed to fetch license options", error);
    throw error;
  }
};

export const getLicenseDeletePreview = async (id) => {
  try {
    return unwrap(await api.get(`/licenses/${id}/delete-preview`), "Failed to load delete preview");
  } catch (error) {
    console.error("Error loading delete preview:", error);
    throw error;
  }
};
