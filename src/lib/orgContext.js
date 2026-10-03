"use client";

import { useMemo, useSyncExternalStore } from "react";
import { ORG_CONTEXT_CHANGED_EVENT } from "@/services/organizationService.js";
import { parseOrgContextSnapshot } from "@/lib/orgContextSnapshot.js";

function subscribe(callback) {
  window.addEventListener(ORG_CONTEXT_CHANGED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ORG_CONTEXT_CHANGED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

const KEYS = ["isSuperAdmin", "acting_as_organization", "organization_id", "menu", "organization"];
const read = () => KEYS.map((key) => window.localStorage.getItem(key) ?? "").join("\n");
const readServer = () => KEYS.map(() => "").join("\n");

export function useOrgContext() {
  const snapshot = useSyncExternalStore(subscribe, read, readServer);

  return useMemo(() => {
    const context = parseOrgContextSnapshot(snapshot);
    return {
      ...context,
      orgKey: context.organizationId || "home",
      canReadMenu: (name) => !Array.isArray(context.menu) || context.menu.find((entry) => entry.key === name)?.canRead !== false,
      can: (name, action) => !Array.isArray(context.menu) || context.menu.find((entry) => entry.key === name)?.[action] !== false,
    };
  }, [snapshot]);
}
