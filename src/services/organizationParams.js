export function withOrganizationId(params = {}, organizationId) {
  return organizationId ? { ...params, organizationId } : params;
}
