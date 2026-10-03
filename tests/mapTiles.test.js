import test from "node:test";
import assert from "node:assert/strict";

import { getMapTile } from "../src/lib/mapTiles.js";

test("uses the no-key Esri satellite imagery in every theme, without the dark street filter", () => {
  const expectedUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

  for (const theme of ["light", "dark"]) {
    const tile = getMapTile(theme);
    assert.equal(tile.url, expectedUrl);
    assert.equal(tile.className, undefined);
    assert.match(tile.attribution, /Esri/);
  }
});
