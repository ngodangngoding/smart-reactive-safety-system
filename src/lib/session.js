export const ACCESS_TOKEN_KEY = "access_token";
export const REFRESH_TOKEN_KEY = "refresh_token";
export const ACCESS_TOKEN_EXPIRES_KEY = "access_token_expires_at";
export const SUPER_ADMIN_ACCESS_KEY = "super_admin_access_token";
export const SUPER_ADMIN_REFRESH_KEY = "super_admin_refresh_token";
export const CONTEXT_KEYS = ["isSuperAdmin", "isAdmin", "user", "organization", "organization_id", "max_device", "menu", "acting_as_organization"];
export const ORGANIZATION_KEYS = ["acting_as_organization", "organization", "organization_id", "max_device", "menu"];

const SESSION_KEYS = [
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  ACCESS_TOKEN_EXPIRES_KEY,
  SUPER_ADMIN_ACCESS_KEY,
  SUPER_ADMIN_REFRESH_KEY,
  ...CONTEXT_KEYS,
];

const ls = () => window.localStorage;

function put(key, value) {
  if (value === null || value === undefined || value === "") ls().removeItem(key);
  else ls().setItem(key, typeof value === "string" ? value : JSON.stringify(value));
}

const snapshot = () => CONTEXT_KEYS.map((key) => ls().getItem(key) ?? "").join("\n");

export function writeTokens({ accessToken, refreshToken, expiresIn }) {
  if (accessToken) ls().setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) ls().setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (accessToken && expiresIn) ls().setItem(ACCESS_TOKEN_EXPIRES_KEY, String(Date.now() + expiresIn * 1000));
}

export function captureSession(storage = ls()) {
  return Object.fromEntries(SESSION_KEYS.map((key) => [key, storage.getItem(key)]));
}

export function restoreSession(snapshot, storage = ls()) {
  for (const key of SESSION_KEYS) storage.removeItem(key);
  for (const [key, value] of Object.entries(snapshot)) {
    if (value !== null) storage.setItem(key, value);
  }
}

export function writeContext({ user, organization = null, permissions = null, acting = null }) {
  const before = snapshot();
  const { organization: nested, ...plainUser } = user;

  put("user", plainUser);
  put("isSuperAdmin", String(user.role === "SUPERADMIN"));
  put("isAdmin", String(user.role === "ADMIN"));
  put("acting_as_organization", acting ? { id: acting.id, name: acting.name } : null);
  put("organization", organization);
  put("organization_id", organization?.id);
  put("max_device", organization?.license?.maxDevice);
  put("menu", permissions);

  return snapshot() !== before;
}

export function syncFromMe(me) {
  return writeContext({
    user: me.user,
    organization: me.organization,
    permissions: me.permissions,
    acting: me.actingOrganizationId ? me.organization : null,
  });
}

export function patchStoredUser(patch) {
  try {
    put("user", { ...JSON.parse(ls().getItem("user") ?? "{}"), ...patch });
  } catch {
  }
}

export function backupSuperAdminTokens() {
  if (ls().getItem("acting_as_organization")) return;
  put(SUPER_ADMIN_ACCESS_KEY, ls().getItem(ACCESS_TOKEN_KEY));
  put(SUPER_ADMIN_REFRESH_KEY, ls().getItem(REFRESH_TOKEN_KEY));
}

export function restoreSuperAdminTokens() {
  const access = ls().getItem(SUPER_ADMIN_ACCESS_KEY);
  const refresh = ls().getItem(SUPER_ADMIN_REFRESH_KEY);
  if (access) ls().setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) ls().setItem(REFRESH_TOKEN_KEY, refresh);
  ls().removeItem(ACCESS_TOKEN_EXPIRES_KEY);
  [SUPER_ADMIN_ACCESS_KEY, SUPER_ADMIN_REFRESH_KEY, ...ORGANIZATION_KEYS].forEach((key) => ls().removeItem(key));
}

export function clearSession() {
  const preferences = ["theme", "sidebar_collapsed"].map((key) => [key, ls().getItem(key)]);
  ls().clear();
  for (const [key, value] of preferences) if (value !== null) ls().setItem(key, value);
}
