// Smoke tests against a running server + seeded DB + Redis.
//   Start the server with MAIL_DRIVER=log, OTP_RESEND_COOLDOWN_SECONDS=2 and its output in a file, then:
//   SMOKE_LOG_FILE=/path/to/server.log SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... npm run test:smoke
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:3000/api";
const LOG_FILE = process.env.SMOKE_LOG_FILE;
const REDIS_CONTAINER = process.env.SMOKE_REDIS_CONTAINER || "smart-reactive-safety-system-redis";
const WEBHOOK_SECRET = process.env.TELEMETRY_WEBHOOK_SECRET;
const COOLDOWN_MS = (Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 2) * 1000 + 300;

// License dates are calendar dates in the server's business time zone (BUSINESS_TIME_ZONE, default Asia/Jakarta).
const BUSINESS_TZ = process.env.BUSINESS_TIME_ZONE || "Asia/Jakarta";
const dayOffset = (days) => {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ }).format(new Date()).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};
const licensePeriod = () => ({ startDate: dayOffset(0), endDate: dayOffset(365) });

const results = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(method, path, { token, body, headers } = {}) {
  const response = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, message: json?.message, data: json?.data, code: json?.data?.code };
}

function assert(condition, detail) {
  if (!condition) throw new Error(detail);
}

async function test(id, name, fn) {
  try {
    await fn();
    results.push({ id, name, ok: true });
    console.log(`PASS ${id} ${name}`);
  } catch (error) {
    results.push({ id, name, ok: false, note: error.message });
    console.log(`FAIL ${id} ${name}: ${error.message}`);
  }
}

function skip(id, name, reason) {
  results.push({ id, name, ok: true, skipped: true, note: reason });
  console.log(`SKIP ${id} ${name} (${reason})`);
}

const redisKeys = (pattern) => execSync(`docker exec ${REDIS_CONTAINER} redis-cli --raw keys "${pattern}"`).toString().split("\n").filter(Boolean);

function latestOtp(email) {
  const lines = readFileSync(LOG_FILE, "utf8").split("\n").filter((line) => line.includes(`OTP for ${email}:`));
  const match = lines.at(-1)?.match(/: (\d{6}) /);
  assert(match, `no OTP for ${email} in ${LOG_FILE}`);
  return match[1];
}

async function login(email, password) {
  const r = await api("POST", "/auth/login", { body: { email, password } });
  assert(r.status === 200, `login ${email} -> ${r.status} ${r.message}`);
  return r.data;
}

const wrongCode = (real) => (real === "000000" ? "111111" : "000000");


const reading = (workerId, sequence, overrides = {}) => ({
  worker_id: workerId, sequence, timestamp: 100000 + sequence * 5000, sos: false,
  accel_x: 0.02, accel_y: 0.01, accel_z: 9.81, gyro_x: 0.1, gyro_y: 0, gyro_z: 0.2,
  temperature: 29.5, pressure: 1009.2, humidity: 61, altitude: 12.4,
  battery_voltage: 3.92, battery_percent: 78, latitude: -6.2088, longitude: 106.8456, satellites: 9,
  ...overrides,
});
const envelope = (data) => ({ type: "telemetry", data, metadata: { device_version: "V1.2" } });

async function webhookTests(sa, stamp) {
  assert(WEBHOOK_SECRET, "set TELEMETRY_WEBHOOK_SECRET (same value the server runs with)");
  const hookPath = `/webhooks/telemetry/${WEBHOOK_SECRET}`;

  // Fixture: its own license, organization, 3 workers and 3 nodes.
  const license = (await api("POST", "/licenses", { token: sa, body: { name: `Smoke ${stamp}`, maxDevice: 5, ...licensePeriod() } })).data;
  const org = (await api("POST", "/organizations", { token: sa, body: { name: `Smoke Org ${stamp}`, licenseId: license.id } })).data;
  assert(org?.id, "fixture organization not created");
  const base = 50000 + (stamp % 10000);
  const nodes = [];
  for (let i = 0; i < 3; i++) {
    const worker = await api("POST", "/workers", { token: sa, body: { workerCode: `SMK-${stamp}-${i}`, name: `Smoke Worker ${i}`, organizationId: org.id } });
    assert(worker.status === 201, `fixture worker ${worker.status} ${worker.message}`);
    const node = await api("POST", "/worker-nodes", { token: sa, body: { deviceWorkerId: base + i, workerId: worker.data.id } });
    assert(node.status === 201, `fixture node ${node.status} ${node.message}`);
    nodes.push({ deviceId: base + i, nodeId: node.data.id, workerId: worker.data.id });
  }
  const [n1, n2, n3] = nodes;

  await test("T27", "webhook with a wrong secret in the path -> 401 WEBHOOK_UNAUTHORIZED", async () => {
    const wrong = await api("POST", "/webhooks/telemetry/nope", { body: envelope(reading(n1.deviceId, 1)) });
    const almost = await api("POST", `/webhooks/telemetry/${WEBHOOK_SECRET}x`, { body: envelope(reading(n1.deviceId, 1)) });
    assert(wrong.code === "WEBHOOK_UNAUTHORIZED" && almost.code === "WEBHOOK_UNAUTHORIZED", `${wrong.status}/${almost.status}`);
  });

  await test("T28", "webhook single reading: firmware envelope and flat payload", async () => {
    const enveloped = await api("POST", hookPath, { body: envelope(reading(n1.deviceId, 1)) });
    assert(enveloped.status === 201 && enveloped.data.telemetryId, `envelope -> ${enveloped.status} ${enveloped.message}`);
    const flat = await api("POST", hookPath, { body: reading(n1.deviceId, 2) });
    assert(flat.status === 201, `flat payload -> ${flat.status} ${flat.message}`);
  });

  await test("T29", "same reading twice -> duplicate:true, one stored row", async () => {
    const payload = envelope(reading(n1.deviceId, 3));
    const first = await api("POST", hookPath, { body: payload });
    const second = await api("POST", hookPath, { body: payload });
    assert(first.status === 201 && second.status === 200 && second.data.duplicate === true, `${first.status}/${second.status}`);
    const rows = await api("GET", `/telemetry?workerNodeId=${n1.nodeId}&limit=50`, { token: sa });
    assert(rows.data.filter((row) => row.sequence === 3).length === 1, "row stored more than once");
  });

  let incidentId;
  await test("T30", "batch of 3 (1 invalid, 1 sos) -> accepted 2, rejected 1, one ACTIVE incident", async () => {
    const body = { data: [envelope(reading(n2.deviceId, 1)), envelope(reading(n2.deviceId, 2, { sos: true })), envelope(reading(n2.deviceId, 3, { latitude: 999 }))] };
    const r = await api("POST", hookPath, { body });
    assert(r.status === 200 && r.data.accepted === 2 && r.data.rejected.length === 1, `${r.status} ${JSON.stringify(r.data)}`);
    assert(r.data.rejected[0].index === 2 && r.data.rejected[0].code === "VALIDATION_ERROR", `rejected ${JSON.stringify(r.data.rejected)}`);
    const active = await api("GET", `/incidents?status=ACTIVE&workerId=${n2.workerId}`, { token: sa });
    assert(active.data.items.length === 1, `ACTIVE incidents: ${active.data.items.length}`);
    incidentId = active.data.items[0].id;
  });

  await test("T31", "repeated sos=true reuses the same incident", async () => {
    const r = await api("POST", hookPath, { body: envelope(reading(n2.deviceId, 4, { sos: true })) });
    assert(r.status === 201 && r.data.incidentCreated === false && r.data.incidentId === incidentId, JSON.stringify(r.data));
    const active = await api("GET", `/incidents?status=ACTIVE&workerId=${n2.workerId}`, { token: sa });
    assert(active.data.items.length === 1, `ACTIVE incidents: ${active.data.items.length}`);
  });

  await test("T34", "delete ACTIVE incident -> 400; resolve then delete -> 200", async () => {
    const early = await api("DELETE", `/incidents/${incidentId}`, { token: sa });
    assert(early.status === 400 && early.code === "INCIDENT_NOT_RESOLVED", `early delete ${early.status} ${early.code}`);
    const resolved = await api("POST", `/incidents/${incidentId}/resolve`, { token: sa, body: { note: "smoke" } });
    assert(resolved.status === 200, `resolve ${resolved.status} ${resolved.message}`);
    const deleted = await api("DELETE", `/incidents/${incidentId}`, { token: sa });
    assert(deleted.status === 200, `delete ${deleted.status} ${deleted.message}`);
  });

  await test("T32", "webhook for a deleted node -> DEVICE_NOT_REGISTERED", async () => {
    const del = await api("DELETE", `/worker-nodes/${n1.nodeId}`, { token: sa });
    assert(del.status === 200, `delete node ${del.status}`);
    const r = await api("POST", hookPath, { body: envelope(reading(n1.deviceId, 10)) });
    assert(r.status === 404 && r.code === "DEVICE_NOT_REGISTERED", `${r.status} ${r.code}`);
  });

  await test("T33", "webhook for an inactive organization -> ORG_INACTIVE", async () => {
    const off = await api("PATCH", `/organizations/${org.id}`, { token: sa, body: { isActive: false } });
    assert(off.status === 200, `deactivate ${off.status}`);
    const r = await api("POST", hookPath, { body: envelope(reading(n3.deviceId, 1)) });
    assert(r.status === 403 && r.code === "ORG_INACTIVE", `${r.status} ${r.code}`);
  });

  await api("DELETE", `/organizations/${org.id}`, { token: sa });
}


let deviceCounter = 60000 + Math.floor(Math.random() * 20000);
let fixtureCounter = 0;
const hook = (deviceId, sequence, overrides) =>
  api("POST", `/webhooks/telemetry/${WEBHOOK_SECRET}`, { body: envelope(reading(deviceId, sequence, overrides)) });
const decodeJwt = (token) => JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());

// One license + organization + ADMIN + `workers` workers, the first `nodes` of them with a device.
async function makeFixture(sa, stamp, { maxDevice = 5, workers = 3, nodes = 2, licenseId } = {}) {
  const key = `${stamp}${++fixtureCounter}`;
  const license = licenseId ? { id: licenseId } : (await api("POST", "/licenses", { token: sa, body: { name: `Core ${key}`, maxDevice, ...licensePeriod() } })).data;
  const org = (await api("POST", "/organizations", { token: sa, body: { name: `Core Org ${key}`, licenseId: license.id } })).data;
  assert(org?.id, "fixture organization not created");
  const email = `core.${key}@example.com`;
  const password = "CorePass123!";
  const admin = await api("POST", "/users", { token: sa, body: { name: "Core Admin", email, password, role: "ADMIN", organizationId: org.id } });
  assert(admin.status === 201, `fixture admin ${admin.status} ${admin.message}`);

  const fx = { license, org, email, password, adminId: admin.data.id, workers: [], nodes: [] };
  for (let i = 0; i < workers; i++) {
    const worker = await api("POST", "/workers", { token: sa, body: { workerCode: `CORE-${key}-${i}`, name: `Core Worker ${i}`, organizationId: org.id } });
    assert(worker.status === 201, `fixture worker ${worker.status} ${worker.message}`);
    fx.workers.push({ id: worker.data.id, code: `CORE-${key}-${i}` });
    if (i < nodes) {
      const deviceId = ++deviceCounter;
      const node = await api("POST", "/worker-nodes", { token: sa, body: { deviceWorkerId: deviceId, workerId: worker.data.id } });
      assert(node.status === 201, `fixture node ${node.status} ${node.message}`);
      fx.nodes.push({ id: node.data.id, deviceId, workerId: worker.data.id });
    }
  }
  fx.adminToken = (await login(email, password)).accessToken;
  return fx;
}

async function coreTests(sa, stamp) {
  assert(WEBHOOK_SECRET, "set TELEMETRY_WEBHOOK_SECRET");

  await test("T01", "login SUPERADMIN and ADMIN: tokens carry tv and jti", async () => {
    const fx = await makeFixture(sa, stamp, { workers: 0, nodes: 0 });
    for (const token of [sa, fx.adminToken]) {
      const claims = decodeJwt(token);
      assert(Number.isInteger(claims.tv) && claims.jti, `claims ${JSON.stringify(claims)}`);
    }
    await api("DELETE", `/organizations/${fx.org.id}`, { token: sa });
  });

  await test("T03", "license without maxDevice or with maxDevice=0 -> 400", async () => {
    const a = await api("POST", "/licenses", { token: sa, body: { name: "No max" } });
    const b = await api("POST", "/licenses", { token: sa, body: { name: "Zero", maxDevice: 0 } });
    assert(a.status === 400 && b.status === 400, `${a.status}/${b.status}`);
  });

  await test("L01", "license dates: required, start >= today, end >= start + 1 day (backend)", async () => {
    const attempt = (body) => api("POST", "/licenses", { token: sa, body: { name: `Dates ${stamp}`, maxDevice: 1, ...body } });
    const cases = [
      ["missing startDate", { endDate: dayOffset(5) }, 400],
      ["missing endDate", { startDate: dayOffset(0) }, 400],
      ["start yesterday", { startDate: dayOffset(-1), endDate: dayOffset(5) }, 400],
      ["end == start", { startDate: dayOffset(0), endDate: dayOffset(0) }, 400],
      ["end < start", { startDate: dayOffset(1), endDate: dayOffset(0) }, 400],
      ["start today, end tomorrow", { startDate: dayOffset(0), endDate: dayOffset(1) }, 201],
      ["start tomorrow, end +2", { startDate: dayOffset(1), endDate: dayOffset(2) }, 201],
    ];
    for (const [label, body, expected] of cases) {
      const r = await attempt(body);
      assert(r.status === expected, `${label}: ${r.status} ${r.message}`);
      if (r.status === 201) await api("DELETE", `/licenses/${r.data.id}`, { token: sa });
    }
  });

  await test("T04", "license with legacy maxMaster in body -> 201, field ignored", async () => {
    const r = await api("POST", "/licenses", { token: sa, body: { name: `Legacy ${stamp}`, maxDevice: 1, maxMaster: 9, ...licensePeriod() } });
    assert(r.status === 201 && !("maxMaster" in r.data), `${r.status} ${JSON.stringify(r.data)}`);
    await api("DELETE", `/licenses/${r.data.id}`, { token: sa });
  });

  // F: quota 2, 2 nodes, 4 workers (2 without a device).
  const F = await makeFixture(sa, stamp, { maxDevice: 2, workers: 4, nodes: 2 });
  const [f1, f2] = F.nodes;
  await hook(f1.deviceId, 1, { sos: true });
  await hook(f1.deviceId, 2);
  await hook(f2.deviceId, 1);

  await test("T05", "registering a device beyond maxDevice -> 409 LICENSE_QUOTA_EXCEEDED", async () => {
    const r = await api("POST", "/worker-nodes", { token: sa, body: { deviceWorkerId: ++deviceCounter, workerId: F.workers[2].id } });
    assert(r.status === 409 && r.code === "LICENSE_QUOTA_EXCEEDED" && r.data.used === 2 && r.data.max === 2, `${r.status} ${r.code} ${JSON.stringify(r.data)}`);
  });

  await test("T06", "lowering maxDevice below usage -> 409 LICENSE_QUOTA_BELOW_USAGE", async () => {
    const r = await api("PATCH", `/licenses/${F.license.id}`, { token: sa, body: { maxDevice: 1 } });
    assert(r.status === 409 && r.code === "LICENSE_QUOTA_BELOW_USAGE", `${r.status} ${r.code}`);
  });

  await test("T07", "deleting a license used by an active organization -> 409 LICENSE_IN_USE", async () => {
    const r = await api("DELETE", `/licenses/${F.license.id}`, { token: sa });
    assert(r.status === 409 && r.code === "LICENSE_IN_USE" && r.data.organizations.length === 1, `${r.status} ${r.code}`);
  });

  await test("T12", "organization delete-preview matches fixture data", async () => {
    const r = await api("GET", `/organizations/${F.org.id}/delete-preview`, { token: sa });
    const d = r.data;
    assert(d.users === 1 && d.workers === 4 && d.workerNodes === 2 && d.telemetry === 3 && d.incidents === 1 && d.licenseWillBeDeleted === true, JSON.stringify(d));
  });

  // G: a second tenant used for isolation and lifecycle checks.
  const G = await makeFixture(sa, stamp, { maxDevice: 3, workers: 2, nodes: 1 });
  await hook(G.nodes[0].deviceId, 1, { sos: true });
  const gIncident = (await api("GET", `/incidents?workerId=${G.workers[0].id}`, { token: sa })).data.items[0];

  await test("T35a", "SUPERADMIN organization filters confine dashboard, monitoring, incidents, and audit logs", async () => {
    const [summary, monitoring, incidents, auditLogs] = await Promise.all([
      api("GET", `/dashboard/summary?organizationId=${F.org.id}`, { token: sa }),
      api("GET", `/monitoring?organizationId=${F.org.id}`, { token: sa }),
      api("GET", `/incidents?organizationId=${F.org.id}&pageSize=100`, { token: sa }),
      api("GET", `/audit-logs?organizationId=${F.org.id}&pageSize=100`, { token: sa }),
    ]);
    assert(summary.status === 200 && summary.data.workers === F.workers.length, `summary ${summary.status} ${JSON.stringify(summary.data)}`);
    assert(monitoring.data.every((entry) => entry.worker.organizationId === F.org.id), "monitoring leaked another organization");
    assert(incidents.data.items.every((incident) => incident.organizationId === F.org.id), "incidents leaked another organization");
    assert(auditLogs.data.items.every((log) => log.organization?.id === F.org.id), "audit logs leaked another organization");
  });

  await test("T35", "ADMIN of one organization cannot reach another's data", async () => {
    const t = F.adminToken;
    const checks = [
      await api("GET", `/workers/${G.workers[0].id}`, { token: t }),
      await api("GET", `/worker-nodes/${G.nodes[0].id}`, { token: t }),
      await api("GET", `/incidents/${gIncident.id}`, { token: t }),
      await api("GET", `/audit-logs?organizationId=${G.org.id}`, { token: t }),
      await api("GET", `/incidents?organizationId=${G.org.id}`, { token: t }),
      await api("GET", `/monitoring?organizationId=${G.org.id}`, { token: t }),
      await api("GET", `/dashboard/summary?organizationId=${G.org.id}`, { token: t }),
      await api("GET", `/telemetry/latest?workerNodeId=${G.nodes[0].id}`, { token: t }),
    ];
    assert(checks.every((r) => r.status === 403 || r.status === 404), checks.map((r) => r.status).join(","));
    const own = await api("GET", "/workers?pageSize=100", { token: t });
    assert(own.data.items.every((w) => w.organizationId === F.org.id), "own list leaks other organizations");
  });

  await test("T08", "delete WorkerNode: node data soft-deleted, worker stays, same device id reusable", async () => {
    const del = await api("DELETE", `/worker-nodes/${f1.id}`, { token: sa });
    assert(del.status === 200 && del.data.cascade.telemetry === 2 && del.data.cascade.incidents === 1, JSON.stringify(del.data));
    assert((await api("GET", `/worker-nodes/${f1.id}`, { token: sa })).status === 404, "node still readable");
    assert((await api("GET", `/telemetry/latest?workerNodeId=${f1.id}`, { token: sa })).status === 404, "telemetry still readable");
    const worker = await api("GET", `/workers/${f1.workerId}`, { token: sa });
    assert(worker.status === 200 && worker.data.workerNode === null, "worker missing or still linked");
    const again = await api("POST", "/worker-nodes", { token: sa, body: { deviceWorkerId: f1.deviceId, workerId: f1.workerId } });
    assert(again.status === 201, `re-register -> ${again.status} ${again.message}`);
    f1.id = again.data.id;
  });

  await test("T09", "delete Worker: worker, node, telemetry, incidents soft-deleted; workerCode reusable", async () => {
    const del = await api("DELETE", `/workers/${f2.workerId}`, { token: sa });
    assert(del.status === 200 && del.data.cascade.workerNodes === 1 && del.data.cascade.telemetry === 1, JSON.stringify(del.data));
    assert((await api("GET", `/workers/${f2.workerId}`, { token: sa })).status === 404, "worker still readable");
    assert((await api("GET", `/worker-nodes/${f2.id}`, { token: sa })).status === 404, "node still readable");
    const reuse = await api("POST", "/workers", { token: sa, body: { workerCode: F.workers[1].code, name: "Reborn", organizationId: F.org.id } });
    assert(reuse.status === 201, `reuse workerCode -> ${reuse.status} ${reuse.message}`);
  });

  await test("T18", "deleted records vanish from lists and /monitoring", async () => {
    const workers = await api("GET", `/workers?organizationId=${F.org.id}&pageSize=100`, { token: sa });
    assert(!workers.data.items.some((w) => w.id === f2.workerId), "deleted worker listed");
    const nodes = await api("GET", `/worker-nodes?organizationId=${F.org.id}&pageSize=100`, { token: sa });
    assert(!nodes.data.items.some((n) => n.workerId === f2.workerId), "deleted node listed");
    const monitoring = await api("GET", `/monitoring?organizationId=${F.org.id}`, { token: sa });
    assert(!monitoring.data.some((entry) => entry.worker.id === f2.workerId), "deleted worker in monitoring");
    const incidents = await api("GET", `/incidents?workerId=${f1.workerId}`, { token: sa });
    assert(incidents.data.items.length === 0, "deleted incident listed");
  });

  await test("T10", "delete user: token revoked, email reusable", async () => {
    const email = `core.tmp.${stamp}@example.com`;
    const created = await api("POST", "/users", { token: sa, body: { name: "Temp", email, password: "TempPass123!", role: "ADMIN", organizationId: G.org.id } });
    assert(created.status === 201, `create ${created.status}`);
    const session = await login(email, "TempPass123!");
    assert((await api("DELETE", `/users/${created.data.id}`, { token: sa })).status === 200, "delete failed");
    const stale = await api("GET", "/auth/me", { token: session.accessToken });
    assert(stale.status === 401 && stale.code === "TOKEN_REVOKED", `${stale.status} ${stale.code}`);
    const again = await api("POST", "/users", { token: sa, body: { name: "Temp2", email, password: "TempPass123!", role: "ADMIN", organizationId: G.org.id } });
    assert(again.status === 201, `email reuse -> ${again.status}`);
    await api("DELETE", `/users/${again.data.id}`, { token: sa });
  });

  await test("T11", "deleting yourself -> 400 CANNOT_DELETE_SELF", async () => {
    const me = await api("GET", "/auth/me", { token: sa });
    const r = await api("DELETE", `/users/${me.data.user.id}`, { token: sa });
    assert(r.status === 400 && r.code === "CANNOT_DELETE_SELF", `${r.status} ${r.code}`);
  });
  skip("T11b", "LAST_SUPERADMIN", "unreachable through the API: the caller is itself an active SUPERADMIN and self-delete is blocked first");

  await test("T02", "ADMIN login while the organization is inactive -> 403 ORG_INACTIVE", async () => {
    assert((await api("PATCH", `/organizations/${G.org.id}`, { token: sa, body: { isActive: false } })).status === 200, "deactivate failed");
    const r = await api("POST", "/auth/login", { body: { email: G.email, password: G.password } });
    assert(r.status === 403 && r.code === "ORG_INACTIVE", `${r.status} ${r.code}`);
    await api("PATCH", `/organizations/${G.org.id}`, { token: sa, body: { isActive: true } });
  });

  await test("T13", "delete organization (unshared license): everything cascades in one go", async () => {
    const del = await api("DELETE", `/organizations/${F.org.id}`, { token: sa });
    const c = del.data?.cascade;
    assert(del.status === 200 && c.users === 1 && c.license === "deleted", JSON.stringify(del.data));
    assert((await api("GET", `/organizations/${F.org.id}`, { token: sa })).status === 404, "organization readable");
    assert((await api("GET", `/licenses/${F.license.id}`, { token: sa })).status === 404, "license readable");
    const audit = await api("GET", `/audit-logs?action=SOFT_DELETE_ORGANIZATION&organizationId=${F.org.id}`, { token: sa });
    assert(audit.data.items[0]?.metadata?.cascade?.license === "deleted", "audit log without cascade");
  });

  await test("T15", "ADMIN token of a deleted organization -> 401 TOKEN_REVOKED", async () => {
    const r = await api("GET", "/workers", { token: F.adminToken });
    assert(r.status === 401 && r.code === "TOKEN_REVOKED", `${r.status} ${r.code}`);
  });

  await test("T14", "delete organization whose license is shared: license is kept", async () => {
    const H = await makeFixture(sa, stamp, { workers: 0, nodes: 0 });
    const other = await api("POST", "/organizations", { token: sa, body: { name: `Sharer ${stamp}`, licenseId: H.license.id } });
    assert(other.status === 201, `second org ${other.status}`);
    const del = await api("DELETE", `/organizations/${H.org.id}`, { token: sa });
    assert(del.data?.cascade?.license === "kept", JSON.stringify(del.data));
    assert((await api("GET", `/licenses/${H.license.id}`, { token: sa })).status === 200, "shared license was deleted");
    await api("DELETE", `/organizations/${other.data.id}`, { token: sa });
  });

  await test("T16", "acting SUPERADMIN loses its organization -> ACTING_ORG_UNAVAILABLE; switching to null recovers", async () => {
    const J = await makeFixture(sa, stamp, { workers: 0, nodes: 0 });
    const acting = await api("POST", "/auth/switch-organization", { token: sa, body: { organizationId: J.org.id } });
    assert(acting.status === 200, `switch ${acting.status} ${acting.message}`);
    await api("DELETE", `/organizations/${J.org.id}`, { token: sa });
    const dead = await api("GET", "/workers", { token: acting.data.accessToken });
    assert(dead.status === 403 && dead.code === "ACTING_ORG_UNAVAILABLE", `${dead.status} ${dead.code}`);
    const home = await api("POST", "/auth/switch-organization", { token: acting.data.accessToken, body: { organizationId: null } });
    assert(home.status === 200, `switch null ${home.status}`);
    assert((await api("GET", "/workers", { token: home.data.accessToken })).status === 200, "home token rejected");
  });

  await test("T36", "POST /auth/google: 503 when not configured; 400/401 for bad input when configured", async () => {
    const configured = Boolean(process.env.GOOGLE_CLIENT_ID);
    const bad = await api("POST", "/auth/google", { body: { idToken: "not-a-real-token" } });
    if (!configured) {
      assert(bad.status === 503 && bad.code === "SERVICE_UNAVAILABLE", `${bad.status} ${bad.code}`);
      return;
    }
    const missing = await api("POST", "/auth/google", { body: {} });
    assert(missing.status === 400, `missing idToken -> ${missing.status}`);
    assert(bad.status === 401 && bad.code === "GOOGLE_TOKEN_INVALID", `${bad.status} ${bad.code}`);
  });

  await test("U01-U04", "PATCH /auth/me: name, duplicate email, empty body, sessions stay valid", async () => {
    const U = await makeFixture(sa, stamp, { workers: 0, nodes: 0 });
    const token = U.adminToken;
    const named = await api("PATCH", "/auth/me", { token, body: { name: "Renamed Admin" } });
    assert(named.status === 200 && named.data.user.name === "Renamed Admin", `U01 ${named.status} ${named.message}`);
    const dup = await api("PATCH", "/auth/me", { token, body: { email: process.env.SUPERADMIN_EMAIL } });
    assert(dup.status === 409 && dup.code === "DUPLICATE" && dup.data.field === "email", `U02 ${dup.status} ${dup.code} ${dup.data?.field}`);
    const empty = await api("PATCH", "/auth/me", { token, body: {} });
    assert(empty.status === 400 && empty.code === "VALIDATION_ERROR", `U03 ${empty.status} ${empty.code}`);
    const changed = await api("PATCH", "/auth/me", { token, body: { email: `U.${U.email}` } });
    assert(changed.status === 200 && changed.data.user.email === `u.${U.email}`, `email change ${changed.status} ${changed.message}`);
    const me = await api("GET", "/auth/me", { token });
    assert(me.status === 200 && me.data.user.name === "Renamed Admin", `U04 old token after email change -> ${me.status}`);
    await api("DELETE", `/organizations/${U.org.id}`, { token: sa });
  });

  await test("U09", "ADMIN cannot be created in an inactive organization; options?operationalOnly hides it", async () => {
    const V = await makeFixture(sa, stamp, { workers: 0, nodes: 0 });
    const before = await api("GET", "/organizations/options?operationalOnly=true", { token: sa });
    assert(before.data.some((org) => org.id === V.org.id), "operational org missing from options");
    await api("PATCH", `/organizations/${V.org.id}`, { token: sa, body: { isActive: false } });
    const after = await api("GET", "/organizations/options?operationalOnly=true", { token: sa });
    assert(!after.data.some((org) => org.id === V.org.id), "inactive org still listed");
    const r = await api("POST", "/users", { token: sa, body: { name: "Nope", email: `nope.${stamp}@example.com`, password: "NopePass123!", role: "ADMIN", organizationId: V.org.id } });
    assert(r.status === 403 && r.code === "ORG_INACTIVE", `${r.status} ${r.code}`);
    await api("DELETE", `/organizations/${V.org.id}`, { token: sa });
  });

  await test("U10", "lastLoginAt is null until first login, then set; googleLinkedAt stays null; sortBy=lastLoginAt", async () => {
    const W = await makeFixture(sa, stamp, { workers: 0, nodes: 0 });
    const email = `late.${stamp}@example.com`;
    const created = await api("POST", "/users", { token: sa, body: { name: "Late", email, password: "LatePass123!", role: "ADMIN", organizationId: W.org.id } });
    const before = await api("GET", `/users/${created.data.id}`, { token: sa });
    assert(before.data.lastLoginAt === null && before.data.googleLinkedAt === null, `before login: ${JSON.stringify([before.data.lastLoginAt, before.data.googleLinkedAt])}`);
    await login(email, "LatePass123!");
    const after = await api("GET", `/users/${created.data.id}`, { token: sa });
    assert(after.data.lastLoginAt && after.data.googleLinkedAt === null, `after login: ${JSON.stringify([after.data.lastLoginAt, after.data.googleLinkedAt])}`);
    const sorted = await api("GET", `/users?organizationId=${W.org.id}&sortBy=lastLoginAt&sortOrder=desc`, { token: sa });
    assert(sorted.status === 200 && sorted.data.items.length === 2, `sorted ${sorted.status}`);
    const me = await api("GET", "/auth/me", { token: W.adminToken });
    assert("googleLinkedAt" in me.data.user && "lastLoginAt" in me.data.user, "/auth/me lacks the new fields");
    await api("DELETE", `/organizations/${W.org.id}`, { token: sa });
  });

  await test("U11", "DELETE /auth/me: wrong password 400; right password 200, sessions dead, email reusable", async () => {
    const X = await makeFixture(sa, stamp, { workers: 0, nodes: 0 });
    const wrong = await api("DELETE", "/auth/me", { token: X.adminToken, body: { password: "not-my-password" } });
    assert(wrong.status === 400 && wrong.data.fields?.password, `wrong password -> ${wrong.status}`);
    const none = await api("DELETE", "/auth/me", { token: X.adminToken, body: {} });
    assert(none.status === 400, `no password -> ${none.status}`);
    const ok = await api("DELETE", "/auth/me", { token: X.adminToken, body: { password: X.password } });
    assert(ok.status === 200, `delete -> ${ok.status} ${ok.message}`);
    const stale = await api("GET", "/auth/me", { token: X.adminToken });
    assert(stale.status === 401 && stale.code === "TOKEN_REVOKED", `old token -> ${stale.status} ${stale.code}`);
    const relogin = await api("POST", "/auth/login", { body: { email: X.email, password: X.password } });
    assert(relogin.status === 401, `login after delete -> ${relogin.status}`);
    const again = await api("POST", "/users", { token: sa, body: { name: "Back", email: X.email, password: "BackPass123!", role: "ADMIN", organizationId: X.org.id } });
    assert(again.status === 201, `email reuse -> ${again.status}`);
    await api("DELETE", `/organizations/${X.org.id}`, { token: sa });
  });

  for (const id of ["U05", "U06", "U07", "U08"]) skip(id, "user UI behaviour", "browser UI (confirm dialog, disabled delete button); no HTTP surface to assert");

  skip("T17", "cascade rolls back on a mid-way failure", "needs fault injection inside the transaction; the cascade runs in one interactive $transaction, not exercised over HTTP");

  await api("DELETE", `/organizations/${G.org.id}`, { token: sa });
}

async function main() {
  assert(LOG_FILE, "set SMOKE_LOG_FILE to the server output file (needed to read OTPs)");
  const superadmin = await login(process.env.SUPERADMIN_EMAIL, process.env.SUPERADMIN_PASSWORD);
  const sa = superadmin.accessToken;

  const orgs = await api("GET", "/organizations?pageSize=100", { token: sa });
  const org = orgs.data.items.find((o) => o.license);
  assert(org, "need an Organization with a license");

  const stamp = Date.now();
  const email = `smoke.${stamp}@example.com`;
  const password = "SmokePass123!";
  const created = await api("POST", "/users", { token: sa, body: { name: "Smoke User", email, password, role: "ADMIN", organizationId: org.id } });
  assert(created.status === 201, `create smoke user -> ${created.status} ${created.message}`);
  const userId = created.data.id;

  await test("T19", "forgot-password unknown email: generic 200, no Redis key", async () => {
    const ghost = `ghost.${stamp}@example.com`;
    const r = await api("POST", "/auth/forgot-password", { body: { email: ghost } });
    assert(r.status === 200, `status ${r.status}`);
    assert(redisKeys(`*otp:${ghost}`).length === 0, "Redis key created for unknown email");
  });

  await test("T20", "forgot-password twice within cooldown -> 429 OTP_COOLDOWN", async () => {
    const first = await api("POST", "/auth/forgot-password", { body: { email } });
    assert(first.status === 200, `first ${first.status}`);
    const second = await api("POST", "/auth/forgot-password", { body: { email } });
    assert(second.status === 429 && second.code === "OTP_COOLDOWN", `second ${second.status} ${second.code}`);
    assert(second.data.retryAfterSeconds > 0, "no retryAfterSeconds");
  });

  await test("T21", "verify-otp: 4 wrong (remaining 4,3,2,1) then correct", async () => {
    const real = latestOtp(email);
    for (const expected of [4, 3, 2, 1]) {
      const r = await api("POST", "/auth/verify-otp", { body: { email, otpCode: wrongCode(real) } });
      assert(r.code === "OTP_INVALID" && r.data.remainingAttempts === expected, `expected remaining ${expected}, got ${r.code} ${r.data?.remainingAttempts}`);
    }
    const ok = await api("POST", "/auth/verify-otp", { body: { email, otpCode: real } });
    assert(ok.status === 200 && ok.data.resetToken, `correct code -> ${ok.status} ${ok.code}`);
  });

  await sleep(COOLDOWN_MS);
  await test("T22", "verify-otp: 5 wrong -> OTP_LOCKED and key removed", async () => {
    await api("POST", "/auth/forgot-password", { body: { email } });
    const real = latestOtp(email);
    let last;
    for (let i = 0; i < 5; i++) last = await api("POST", "/auth/verify-otp", { body: { email, otpCode: wrongCode(real) } });
    assert(last.code === "OTP_LOCKED", `5th attempt -> ${last.code}`);
    assert(redisKeys(`*otp:${email}`).length === 0, "OTP key still present");
  });

  await sleep(COOLDOWN_MS);
  await test("T23", "5 parallel wrong verify-otp: exactly 4 INVALID + 1 LOCKED (atomic)", async () => {
    await api("POST", "/auth/forgot-password", { body: { email } });
    const real = latestOtp(email);
    const responses = await Promise.all(Array.from({ length: 5 }, () => api("POST", "/auth/verify-otp", { body: { email, otpCode: wrongCode(real) } })));
    const invalid = responses.filter((r) => r.code === "OTP_INVALID").length;
    const locked = responses.filter((r) => r.code === "OTP_LOCKED").length;
    assert(invalid === 4 && locked === 1, `INVALID=${invalid} LOCKED=${locked}`);
    const after = await api("POST", "/auth/verify-otp", { body: { email, otpCode: real } });
    assert(after.status === 400, `correct code after lock -> ${after.status}`);
  });

  await sleep(COOLDOWN_MS);
  let firstToken;
  await test("T24", "second successful verify-otp revokes the first reset token", async () => {
    await api("POST", "/auth/forgot-password", { body: { email } });
    const a = await api("POST", "/auth/verify-otp", { body: { email, otpCode: latestOtp(email) } });
    assert(a.status === 200, `first verify ${a.status}`);
    firstToken = a.data.resetToken;
    await sleep(COOLDOWN_MS);
    await api("POST", "/auth/forgot-password", { body: { email } });
    const b = await api("POST", "/auth/verify-otp", { body: { email, otpCode: latestOtp(email) } });
    assert(b.status === 200, `second verify ${b.status}`);
    assert(b.data.resetToken !== firstToken, "same token issued twice");
    const stale = await api("POST", "/auth/reset-password", { body: { resetToken: firstToken, newPassword: "AnotherPass123!", confirmPassword: "AnotherPass123!" } });
    assert(stale.code === "RESET_TOKEN_INVALID", `stale token -> ${stale.status} ${stale.code}`);
    firstToken = b.data.resetToken;
  });

  await test("T25", "reset-password with the current password -> PASSWORD_REUSED", async () => {
    const r = await api("POST", "/auth/reset-password", { body: { resetToken: firstToken, newPassword: password, confirmPassword: password } });
    assert(r.code === "PASSWORD_REUSED", `${r.status} ${r.code}`);
  });

  await test("T26", "reset-password succeeds once; token and old JWT die", async () => {
    const before = await login(email, password);
    const next = "BrandNewPass123!";
    const ok = await api("POST", "/auth/reset-password", { body: { resetToken: firstToken, newPassword: next, confirmPassword: next } });
    assert(ok.status === 200, `reset -> ${ok.status} ${ok.message}`);
    const again = await api("POST", "/auth/reset-password", { body: { resetToken: firstToken, newPassword: next, confirmPassword: next } });
    assert(again.code === "RESET_TOKEN_INVALID", `reuse -> ${again.status} ${again.code}`);
    const old = await api("GET", "/auth/me", { token: before.accessToken });
    assert(old.status === 401 && old.code === "TOKEN_REVOKED", `old JWT -> ${old.status} ${old.code}`);
    const fresh = await api("POST", "/auth/login", { body: { email, password: next } });
    assert(fresh.status === 200, `login with new password -> ${fresh.status}`);
  });

  await webhookTests(sa, stamp);
  await coreTests(sa, stamp);

  await api("DELETE", `/users/${userId}`, { token: sa });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((error) => {
  console.error("Smoke test aborted:", error.message);
  process.exitCode = 1;
});
