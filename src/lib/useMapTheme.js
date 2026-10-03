"use client";

import { useSyncExternalStore } from "react";

function subscribeTheme(callback) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const getTheme = () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
const getServerTheme = () => "light";

export function useMapTheme() {
  return useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);
}
