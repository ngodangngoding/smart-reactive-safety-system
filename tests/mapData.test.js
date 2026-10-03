import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_MAP_CENTER, hasValidCoordinates, markerSetExpanded, toMonitoringMarkers } from "../src/lib/mapData.js";

test("creates markers for every worker with valid latitude and longitude", () => {
  const entries = [
    {
      worker: { id: "worker-a", name: "Worker A", workerNode: { isActive: true } },
      latestTelemetry: { latitude: "-6.2088", longitude: "106.8456" },
      activeIncident: null,
    },
    {
      worker: { id: "worker-b", name: "Worker B", workerNode: { isActive: true } },
      latestTelemetry: { latitude: "-7.2504", longitude: "112.7688" },
      activeIncident: null,
    },
    {
      worker: { id: "worker-c", name: "Worker C", workerNode: { isActive: true } },
      latestTelemetry: { latitude: null, longitude: null },
      activeIncident: null,
    },
  ];

  assert.deepEqual(
    toMonitoringMarkers(entries, () => "online").map(({ id, lat, lng }) => ({ id, lat, lng })),
    [
      { id: "worker-a", lat: -6.2088, lng: 106.8456 },
      { id: "worker-b", lat: -7.2504, lng: 112.7688 },
    ]
  );
});

test("uses the default map center without treating it as a worker location", () => {
  assert.equal(hasValidCoordinates({ lat: undefined, lng: undefined }), false);
  assert.deepEqual(DEFAULT_MAP_CENTER, [-6.2, 106.816666]);
});

test("detects valid worker markers that arrive after an empty polling cycle", () => {
  const knownMarkerIds = new Set();
  const arrivingMarkers = [{ id: "worker-a", lat: -6.2088, lng: 106.8456 }];

  assert.equal(markerSetExpanded(knownMarkerIds, arrivingMarkers), true);
  assert.equal(markerSetExpanded(new Set(["worker-a"]), arrivingMarkers), false);
});
