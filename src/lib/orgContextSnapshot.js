function parse(json, fallback) {
  try {
    return json ? JSON.parse(json) : fallback;
  } catch {
    return fallback;
  }
}

export function parseOrgContextSnapshot(snapshot) {
  const [superAdmin, acting, organizationId, menuJson, organizationJson] = snapshot.split("\n");

  return {
    isSuperAdmin: superAdmin === "true",
    actingAsOrg: parse(acting, null),
    organizationId: organizationId || null,
    menu: parse(menuJson, null),
    organization: parse(organizationJson, null),
  };
}
