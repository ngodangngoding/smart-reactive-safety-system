const OPENSTREETMAP_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OPENSTREETMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const LIGHT_TILE = {
  url: OPENSTREETMAP_URL,
  attribution: OPENSTREETMAP_ATTRIBUTION,
};

const DARK_TILE = {
  url: OPENSTREETMAP_URL,
  attribution: OPENSTREETMAP_ATTRIBUTION,
  className: "map-tiles-dark",
};

export const TILES = {
  light: LIGHT_TILE,
  dark: DARK_TILE,
  map: LIGHT_TILE,
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    subdomains: "abc",
  },
};

export function getMapTile() {
  return TILES.satellite;
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
