import test from "node:test";
import assert from "node:assert/strict";

import { captureSession, restoreSession } from "../src/lib/session.js";

class MemoryStorage {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

test("restores the previous token and organization context after a failed organization switch", () => {
  const storage = new MemoryStorage({
    access_token: "old-access",
    refresh_token: "old-refresh",
    organization_id: "org-before",
    organization: JSON.stringify({ id: "org-before", name: "Before" }),
  });
  const snapshot = captureSession(storage);

  storage.setItem("access_token", "new-access");
  storage.setItem("organization_id", "org-after");
  storage.setItem("acting_as_organization", JSON.stringify({ id: "org-after" }));
  restoreSession(snapshot, storage);

  assert.equal(storage.getItem("access_token"), "old-access");
  assert.equal(storage.getItem("refresh_token"), "old-refresh");
  assert.equal(storage.getItem("organization_id"), "org-before");
  assert.equal(storage.getItem("acting_as_organization"), null);
});
