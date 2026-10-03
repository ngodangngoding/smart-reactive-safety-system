import api from "@/services/apiService.js";

export const getAuditLogs = async (params = {}) => {
  try {
    const response = await api.get("/audit-logs", { params });
    if (response.data?.status === "success") return response.data.data;
    throw new Error(response.data?.message || "Failed to fetch audit logs");
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    throw error;
  }
};
