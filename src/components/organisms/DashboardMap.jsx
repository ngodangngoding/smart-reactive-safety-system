"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, ZoomControl, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { DEFAULT_MAP_CENTER, hasValidCoordinates, markerSetExpanded, STATUS_MARKER_COLORS, STATUS_MARKER_GLOW } from "@/lib/mapData.js";
import { getMapTile } from "@/lib/mapTiles.js";
import { useMapTheme } from "@/lib/useMapTheme.js";

const iconCache = {};
function pinIcon(state) {
  const key = STATUS_MARKER_COLORS[state] ? state : "OFFLINE";
  if (!iconCache[key]) {
    const color = STATUS_MARKER_COLORS[key];
    const glow = STATUS_MARKER_GLOW[key];
    iconCache[key] = L.divIcon({
      className: "",
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 6px ${glow},0 1px 4px rgba(16,24,40,.35)"></span>`,
    });
  }
  return iconCache[key];
}

function FitBoundsOnData({ markers }) {
  const map = useMap();
  const knownMarkerIds = useRef(new Set());
  const positionedAtDefault = useRef(false);
  useEffect(() => {
    const valid = markers.filter(hasValidCoordinates);
    if (valid.length === 0) {
      if (!positionedAtDefault.current) map.setView(DEFAULT_MAP_CENTER, 11);
      positionedAtDefault.current = true;
      knownMarkerIds.current = new Set();
      return;
    }

    if (markerSetExpanded(knownMarkerIds.current, valid)) {
      if (valid.length === 1) map.setView([valid[0].lat, valid[0].lng], 18);
      else map.fitBounds(valid.map((marker) => [marker.lat, marker.lng]), { padding: [32, 32], maxZoom: 16 });
    }
    knownMarkerIds.current = new Set(valid.map((marker) => marker.id));
  }, [map, markers]);
  return null;
}

function ResizeMapOnContainerChange() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    let frame;
    let lastWidth = container.clientWidth;
    let lastHeight = container.clientHeight;
    const observer = new ResizeObserver(() => {
      const { clientWidth: width, clientHeight: height } = container;
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize());
    });
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);
  return null;
}

function CenterOnSelected({ selected }) {
  const map = useMap();
  const lastCenteredId = useRef(null);
  useEffect(() => {
    if (!selected) {
      lastCenteredId.current = null;
      return;
    }
    if (hasValidCoordinates(selected) && selected.id !== lastCenteredId.current) {
      map.flyTo([selected.lat, selected.lng], 18);
      lastCenteredId.current = selected.id;
    }
  }, [map, selected]);
  return null;
}

export default function DashboardMap({ markers = [], selected, onSelectMarker }) {
  const theme = useMapTheme();
  const tile = getMapTile(theme);

  return (
    <MapContainer key={theme} center={DEFAULT_MAP_CENTER} zoom={10} maxZoom={18} scrollWheelZoom zoomControl={false} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution={tile.attribution} url={tile.url} subdomains={tile.subdomains} className={tile.className} />
      <ZoomControl position="bottomright" />
      <ResizeMapOnContainerChange />
      <FitBoundsOnData markers={markers} />
      <CenterOnSelected selected={selected} />
      <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} spiderfyOnMaxZoom>
        {markers.filter(hasValidCoordinates).map((m, idx) => (
          <Marker key={`${m.id ?? idx}-${idx}`} position={[m.lat, m.lng]} icon={pinIcon(m.state)} eventHandlers={{ click: () => onSelectMarker?.(m) }}>
            <Tooltip permanent direction="top" offset={[0, -12]} opacity={0.95}>
              <span className={`text-[10px] ${m.id === selected?.id ? "font-bold underline" : "font-semibold"}`}>{m.name}</span>
            </Tooltip>
            {m.popup && <Popup>{m.popup}</Popup>}
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
