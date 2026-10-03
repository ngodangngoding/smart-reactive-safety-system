import test from "node:test";
import assert from "node:assert/strict";
import { getSidebarNavItemClassName } from "../src/components/organisms/sidebarNavStyles.js";

test("inactive sidebar links force the shared secondary text color", () => {
  const classes = getSidebarNavItemClassName(false).split(/\s+/);

  assert.ok(classes.includes("!text-text-secondary"));
  assert.ok(!classes.includes("text-nav-active-foreground"));
});

test("active sidebar links keep the blue active-state token", () => {
  const classes = getSidebarNavItemClassName(true).split(/\s+/);

  assert.ok(classes.includes("text-nav-active-foreground"));
});
