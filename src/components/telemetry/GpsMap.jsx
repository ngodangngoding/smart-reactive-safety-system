"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from "react-leaflet";
import { MapPinOff, Maximize, Minimize, Play } from "lucide-react";
import { getMapTile } from "@/lib/mapTiles.js";
import { DEFAULT_MAP_CENTER, hasValidCoordinates, STATUS_MARKER_COLORS, STATUS_MARKER_GLOW } from "@/lib/mapData.js";
import { useMapTheme } from "@/lib/useMapTheme.js";
import "leaflet/dist/leaflet.css";

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#2563eb";
}

const liveIconCache = {};
function liveIcon(state) {
  const key = STATUS_MARKER_COLORS[state] ? state : "OFFLINE";
  if (!liveIconCache[key]) {
    const color = STATUS_MARKER_COLORS[key];
    const glow = STATUS_MARKER_GLOW[key];
    liveIconCache[key] = L.divIcon({
      className: "",
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 6px ${glow},0 1px 4px rgba(16,24,40,.35)"></span>`,
    });
  }
  return liveIconCache[key];
}

const REPLAY_ICON = L.divIcon({
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: `<span style="display:block;width:12px;height:12px;border-radius:9999px;background:var(--primary);border:3px solid #fff;box-shadow:0 1px 3px rgba(16,24,40,.3);box-sizing:content-box"></span>`,
});

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

function View({ center, fit, zoom = 15 }) {
  const map = useMap();
  useEffect(() => {
    if (fit && fit.length > 1) map.fitBounds(fit, { padding: [24, 24] });
    else map.setView(center, zoom);
  }, [map, center, fit, zoom]);
  return null;
}

function MapButton({ label, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex cursor-pointer items-center justify-center rounded-sm border border-border bg-card text-text-secondary shadow-control hover:bg-surface-subtle ${className}`}
    >
      {children}
    </button>
  );
}

export default function GpsMap({ lat, lng, route, state, popup }) {
  const wrapRef = useRef(null);
  const mapRef = useRef(null);
  const timerRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [replayIdx, setReplayIdx] = useState(null);
  const theme = useMapTheme();
  const tile = getMapTile(theme);

  useEffect(() => {
    const onChange = () => {
      setFullscreen(document.fullscreenElement === wrapRef.current);
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), [route]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else wrapRef.current?.requestFullscreen?.();
  };

  const replay = () => {
    clearInterval(timerRef.current);
    const total = route?.length ?? 0;
    const step = Math.max(1, Math.ceil(total / 200));
    let i = 0;
    setReplayIdx(0);
    timerRef.current = setInterval(() => {
      i += step;
      if (i >= total) {
        clearInterval(timerRef.current);
        setReplayIdx(null);
      } else {
        setReplayIdx(i);
      }
    }, 40);
  };

  const isRoute = Array.isArray(route) && route.length > 0;
  const hasLiveLocation = hasValidCoordinates({ lat, lng });
  const primary = isRoute ? cssVar("--primary") : null;
  const center = isRoute ? route[0] : hasLiveLocation ? [Number(lat), Number(lng)] : DEFAULT_MAP_CENTER;

  return (
    <div ref={wrapRef} className="relative min-h-0 flex-1 bg-card">
      <MapContainer ref={mapRef} center={center} zoom={15} zoomControl={false} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          key={theme}
          attribution={tile.attribution}
          url={tile.url}
          subdomains={tile.subdomains}
          className={tile.className}
        />
        <ResizeMapOnContainerChange />
        {isRoute ? (
          <>
            <View center={center} fit={route} />
            <Polyline positions={route} pathOptions={{ color: primary, weight: 5, opacity: 0.85, lineJoin: "round", lineCap: "round" }} />
            <CircleMarker center={route[0]} radius={7} pathOptions={{ color: primary, weight: 4, fillColor: "#ffffff", fillOpacity: 1 }} />
            <CircleMarker
              center={route[route.length - 1]}
              radius={7}
              pathOptions={{ color: "#ffffff", weight: 4, fillColor: primary, fillOpacity: 1 }}
            />
            {replayIdx != null && <Marker position={route[replayIdx]} icon={REPLAY_ICON} interactive={false} />}
          </>
        ) : (
          <>
            <View center={center} zoom={hasLiveLocation ? 15 : 11} />
            {hasLiveLocation && (
              <Marker position={center} icon={liveIcon(state)}>
                {popup && <Popup>{popup}</Popup>}
              </Marker>
            )}
          </>
        )}
      </MapContainer>

      {!isRoute && !hasLiveLocation && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center px-4">
          <p className="flex items-center gap-2 rounded-sm border border-border bg-card/95 px-3 py-2 text-xs text-text-secondary shadow-segment">
            <MapPinOff className="h-4 w-4" aria-hidden="true" />
            No location data available. No worker marker is shown.
          </p>
        </div>
      )}

      <div className="absolute bottom-3 right-3 z-[1000] flex items-center gap-2">
        {isRoute && route.length > 1 && (
          <button
            type="button"
            onClick={replay}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm bg-primary px-3 text-xs font-semibold text-white shadow-control hover:bg-primary-hover"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            Replay route
          </button>
        )}
        <MapButton label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen} className="h-8 w-8">
          {fullscreen ? <Minimize className="h-4 w-4" aria-hidden="true" /> : <Maximize className="h-4 w-4" aria-hidden="true" />}
        </MapButton>
      </div>
    </div>
  );
}
