import test from "node:test";
import assert from "node:assert/strict";

import { withOrganizationId } from "../src/services/organizationParams.js";

test("adds the selected organization to an application API request", () => {
  assert.deepEqual(withOrganizationId({ status: "ACTIVE" }, "org-magnet"), {
    status: "ACTIVE",
    organizationId: "org-magnet",
  });
});

test("does not send an empty organization filter", () => {
  assert.deepEqual(withOrganizationId({ status: "ACTIVE" }, null), { status: "ACTIVE" });
});
