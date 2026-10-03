export const DEFAULT_MAP_CENTER = [-6.2, 106.816666];

export const STATUS_MARKER_COLORS = {
  NORMAL: "#10B981",
  LOW_BATTERY: "#F59E0B",
  EMERGENCY: "#EF4444",
  OFFLINE: "#9CA3AF",
  UNASSIGNED: "#9CA3AF",
};
export const STATUS_MARKER_GLOW = {
  NORMAL: "rgba(16, 185, 129, .35)",
  LOW_BATTERY: "rgba(245, 158, 11, .35)",
  EMERGENCY: "rgba(239, 68, 68, .35)",
  OFFLINE: "rgba(156, 163, 175, .35)",
  UNASSIGNED: "rgba(156, 163, 175, .35)",
};

export function hasValidCoordinates(location) {
  if (location?.lat == null || location?.lng == null) return false;

  const lat = Number(location.lat);
  const lng = Number(location.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function toMonitoringMarkers(entries, stateForEntry, popupForEntry) {
  return entries.flatMap((entry) => {
    const location = {
      lat: entry.latestTelemetry?.latitude,
      lng: entry.latestTelemetry?.longitude,
    };
    if (!hasValidCoordinates(location)) return [];

    return [{
      id: entry.worker.id,
      name: entry.worker.name,
      lat: Number(location.lat),
      lng: Number(location.lng),
      state: stateForEntry(entry),
      popup: popupForEntry ? popupForEntry(entry) : null,
    }];
  });
}

export function markerSetExpanded(knownMarkerIds, markers) {
  return markers.some((marker) => hasValidCoordinates(marker) && !knownMarkerIds.has(marker.id));
}
