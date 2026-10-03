import api, { unwrap, unwrapMutation } from "@/services/apiService.js";
import { captureSession, restoreSession, writeTokens, writeContext, backupSuperAdminTokens, restoreSuperAdminTokens } from "@/lib/session.js";


export const getOrganizations = async (params = {}) => {
  try {
    return unwrap(await api.get("/organizations", { params }), "Failed to fetch organizations");
  } catch (error) {
    console.error("Error fetching organizations:", error);
    throw error;
  }
};

export const getOrganization = async (id) => {
  try {
    return unwrap(await api.get(`/organizations/${id}`), "Failed to fetch organization");
  } catch (error) {
    console.error("Error fetching organization:", error);
    throw error;
  }
};

export const createOrganization = async (data) => {
  try {
    return unwrapMutation(await api.post("/organizations", data), "Failed to create organization");
  } catch (error) {
    console.error("Error creating organization:", error);
    throw error;
  }
};

export const updateOrganization = async (id, data) => {
  try {
    return unwrapMutation(await api.patch(`/organizations/${id}`, data), "Failed to update organization");
  } catch (error) {
    console.error("Error updating organization:", error);
    throw error;
  }
};

export const deleteOrganization = async (id) => {
  try {
    return unwrapMutation(await api.delete(`/organizations/${id}`), "Failed to delete organization");
  } catch (error) {
    console.error("Error deleting organization:", error);
    throw error;
  }
};

export const ORG_CONTEXT_CHANGED_EVENT = "org-context-changed";

export const switchOrganization = async (organizationId) => {
  try {
    return unwrap(await api.post("/auth/switch-organization", { organizationId }), "Failed to switch organization");
  } catch (error) {
    console.error("Error switching organization:", error);
    throw error;
  }
};

export const enterOrganization = async (org) => {
  const previousSession = captureSession();
  const tokens = await switchOrganization(org.id);

  backupSuperAdminTokens();
  writeTokens(tokens);

  try {
    const me = unwrap(await api.get("/auth/me"), "Failed to load organization context");
    writeContext({ user: me.user, organization: me.organization, permissions: me.permissions, acting: me.organization });
  } catch (error) {
    restoreSession(previousSession);
    console.error("Error loading organization context:", error);
    window.dispatchEvent(new Event(ORG_CONTEXT_CHANGED_EVENT));
    throw error;
  }

  window.dispatchEvent(new Event(ORG_CONTEXT_CHANGED_EVENT));
};

export const exitOrganization = () => {
  restoreSuperAdminTokens();
  window.dispatchEvent(new Event(ORG_CONTEXT_CHANGED_EVENT));
};

export const getOrganizationOptions = async (params = {}) => {
  try {
    return unwrap(await api.get("/organizations/options", { params }), "Failed to fetch organization options");
  } catch (error) {
    console.error("Error: Failed to fetch organization options", error);
    throw error;
  }
};

export const getOrganizationDeletePreview = async (id) => {
  try {
    return unwrap(await api.get(`/organizations/${id}/delete-preview`), "Failed to load delete preview");
  } catch (error) {
    console.error("Error loading delete preview:", error);
    throw error;
  }
};
