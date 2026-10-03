import test from "node:test";
import assert from "node:assert/strict";

import { parseOrgContextSnapshot } from "../src/lib/orgContextSnapshot.js";

test("reads the active organization id from the local-storage snapshot", () => {
  const snapshot = [
    "true",
    JSON.stringify({ id: "org-magnet", name: "PT MAGNET" }),
    "org-magnet",
    "[]",
    JSON.stringify({ id: "org-magnet", name: "PT MAGNET" }),
  ].join("\n");

  assert.equal(parseOrgContextSnapshot(snapshot).organizationId, "org-magnet");
});
