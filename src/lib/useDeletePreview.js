"use client";

import { useEffect, useState } from "react";

export function useDeletePreview(id, fetchPreview) {
  const [state, setState] = useState({ id: null, preview: null, failed: false });

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    fetchPreview(id)
      .then((preview) => !cancelled && setState({ id, preview, failed: false }))
      .catch(() => !cancelled && setState({ id, preview: null, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [id, fetchPreview]);

  const current = state.id === id;
  return { preview: current ? state.preview : null, loading: Boolean(id) && !current, failed: current && state.failed };
}

const LABELS = [
  ["users", "user"],
  ["workers", "worker"],
  ["workerNodes", "device"],
  ["telemetry", "telemetry record"],
  ["incidents", "incident"],
];

export function formatCascade(preview) {
  if (!preview) return "";
  return LABELS.filter(([key]) => preview[key] > 0)
    .map(([key, noun]) => `${preview[key].toLocaleString()} ${noun}${preview[key] === 1 ? "" : "s"}`)
    .join(", ");
}
