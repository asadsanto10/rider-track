import { format } from "date-fns";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { CustomLocation } from "../types";
import { Gap, humanDuration, LocationEntry } from "../utils/parseLog";

(L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl =
  undefined;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const START_ICON = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:36px;height:36px;">
    <div style="position:absolute;inset:0;background:#22c55e;border-radius:50%;opacity:.25;animation:pulse 2s infinite;"></div>
    <div style="position:absolute;top:6px;left:6px;width:24px;height:24px;background:#22c55e;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;">
      <span style="font-size:10px;color:#fff;font-weight:800;line-height:1;">S</span>
    </div>
  </div>`,
  iconAnchor: [18, 18],
  iconSize: [36, 36],
});

const END_ICON = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:36px;height:36px;">
    <div style="position:absolute;inset:0;background:#ef4444;border-radius:50%;opacity:.25;animation:pulse 2s infinite;"></div>
    <div style="position:absolute;top:6px;left:6px;width:24px;height:24px;background:#ef4444;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;">
      <span style="font-size:10px;color:#fff;font-weight:800;line-height:1;">E</span>
    </div>
  </div>`,
  iconAnchor: [18, 18],
  iconSize: [36, 36],
});

const GAP_ICON = L.divIcon({
  className: "",
  html: `<div style="background:#f97316;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(249,115,22,.7)"></div>`,
  iconAnchor: [6, 6],
  iconSize: [12, 12],
});

function riderIcon(bearing: number) {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:32px;height:32px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:#f59e0b;opacity:.25;animation:pulse 1.5s infinite;"></div>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style="position:absolute;inset:0;filter:drop-shadow(0 2px 6px rgba(0,0,0,.45))">
        <circle cx="16" cy="16" r="13" fill="#fff" stroke="#f59e0b" stroke-width="2.2"/>
        <g transform="rotate(${bearing}, 16, 16)">
          <path d="M16 5 L21 22 L16 18 L11 22 Z"
            fill="#f59e0b" stroke="#f59e0b" stroke-width="1" stroke-linejoin="round"/>
        </g>
      </svg>
    </div>`,
    iconAnchor: [16, 16],
    iconSize: [32, 32],
  });
}

interface LayersState {
  glow: L.Polyline | null;
  path: L.Polyline | null;
  markers: L.Layer[];
  gapMarkers: L.Layer[];
  selected: L.CircleMarker | null;
  gapHighlight: L.Layer[];
  rider: L.Marker | null;
  traveledGlow: L.Polyline | null;
  traveledPath: L.Polyline | null;
  customMarkers: L.Layer[];
}

const EMPTY_LAYERS = (): LayersState => ({
  glow: null,
  path: null,
  markers: [],
  gapMarkers: [],
  selected: null,
  gapHighlight: [],
  rider: null,
  traveledGlow: null,
  traveledPath: null,
  customMarkers: [],
});

function customLocationIcon(color: string, name: string, selected: boolean) {
  const pin = selected
    ? `<div style="position:relative;display:inline-flex;justify-content:center;align-items:flex-start;">
        <div style="position:absolute;top:-6px;left:50%;transform:translateX(-50%);width:48px;height:48px;border-radius:50%;background:${color};opacity:.22;animation:pulse 1.5s infinite;pointer-events:none;"></div>
        <svg width="34" height="46" viewBox="0 0 34 46" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 10px ${color}cc)">
          <path d="M17 1C8.16 1 1 8.16 1 17c0 11.25 16 28 16 28s16-16.75 16-28C33 8.16 25.84 1 17 1z" fill="${color}" stroke="#fff" stroke-width="2"/>
          <circle cx="17" cy="16" r="7" fill="#fff" opacity="0.95"/>
          <circle cx="17" cy="16" r="3.5" fill="${color}"/>
        </svg>
      </div>`
    : `<svg width="26" height="36" viewBox="0 0 26 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 6px rgba(0,0,0,.55))">
        <path d="M13 1C6.37 1 1 6.37 1 13c0 8.75 12 22 12 22s12-13.25 12-22C25 6.37 19.63 1 13 1z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
        <circle cx="13" cy="12" r="5" fill="#fff" opacity="0.92"/>
        <circle cx="13" cy="12" r="2.5" fill="${color}" opacity="0.7"/>
      </svg>`;

  const label = `<div style="
    background:${color};color:#fff;
    font-size:${selected ? 11 : 10}px;font-weight:700;
    padding:2px 7px;border-radius:4px;
    white-space:nowrap;max-width:100px;overflow:hidden;text-overflow:ellipsis;
    box-shadow:0 2px 6px rgba(0,0,0,.55);
    ${selected ? `outline:2px solid #fff;outline-offset:1px;` : ""}
    margin-top:2px;
  ">${name}</div>`;

  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;">${pin}${label}</div>`,
    iconAnchor: selected ? [17, 46] : [13, 36],
    iconSize: selected ? [34, 46] : [26, 36],
  });
}

interface Props {
  entries: LocationEntry[];
  gaps: Gap[];
  selectedIndex: number | null;
  onSelectEntry: (index: number) => void;
  riderId: string | null;
  selectedGap: Gap | null;
  playbackIndex: number | null;
  customLocations: CustomLocation[];
  selectedCustomId: string | null;
}

export default function MapView({
  entries,
  gaps,
  selectedIndex,
  onSelectEntry,
  riderId,
  selectedGap,
  playbackIndex,
  customLocations,
  selectedCustomId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<LayersState>(EMPTY_LAYERS());
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tileProvider, setTileProvider] = useState<"osm" | "google">("google");

  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [isFullscreen]);

  // Swap tile layer when provider changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    if (tileProvider === "google") {
      tileLayerRef.current = L.tileLayer(
        "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        {
          subdomains: ["0", "1", "2", "3"],
          attribution: "© Google Maps",
          maxNativeZoom: 21,
          maxZoom: 23,
        },
      ).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { attribution: "© OpenStreetMap contributors", maxNativeZoom: 19, maxZoom: 23 },
      ).addTo(map);
    }
  }, [tileProvider]);

  // Init map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false, maxZoom: 23 }).setView(
      [23.7426, 90.3824],
      16,
    );
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
  }, []);

  // Redraw full path when entries change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || entries.length === 0) return;

    const prev = layersRef.current;
    if (prev.glow) map.removeLayer(prev.glow);
    if (prev.path) map.removeLayer(prev.path);
    if (prev.selected) map.removeLayer(prev.selected);
    if (prev.rider) map.removeLayer(prev.rider);
    prev.markers.forEach((m) => map.removeLayer(m));
    prev.gapMarkers.forEach((m) => map.removeLayer(m));
    prev.gapHighlight.forEach((m) => map.removeLayer(m));

    const latlngs: L.LatLngTuple[] = entries.map((e) => [e.lat, e.lng]);

    const glowLine = L.polyline(latlngs, {
      color: "#7dd3fc",
      weight: 12,
      opacity: 0.18,
    }).addTo(map);
    const polyline = L.polyline(latlngs, {
      color: "#38bdf8",
      weight: 4,
      opacity: 0.85,
    }).addTo(map);

    const newMarkers: L.Layer[] = [];

    newMarkers.push(
      L.marker(latlngs[0], { icon: START_ICON })
        .addTo(map)
        .bindPopup(
          `<b>🛵 Rider #${riderId ?? "?"}</b><br><span style="color:#22c55e;font-weight:600;">▶ Start</span> — ${format(entries[0].timestamp, "dd MMM yyyy, h:mm:ss a (HH:mm:ss)")}`,
        ),
    );
    newMarkers.push(
      L.marker(latlngs[latlngs.length - 1], { icon: END_ICON })
        .addTo(map)
        .bindPopup(
          `<b>🛵 Rider #${riderId ?? "?"}</b><br><span style="color:#ef4444;font-weight:600;">■ End</span> — ${format(entries[entries.length - 1].timestamp, "dd MMM yyyy, h:mm:ss a (HH:mm:ss)")}`,
        ),
    );

    entries.forEach((e, i) => {
      newMarkers.push(
        L.circleMarker([e.lat, e.lng], {
          radius: 5,
          color: "transparent",
          fillOpacity: 0,
        })
          .addTo(map)
          .on("click", () => onSelectEntry(i)),
      );
    });

    const newGapMarkers: L.Layer[] = gaps
      .map((g) => {
        const fromEntry = entries.find((e) => e.timestamp >= g.from);
        if (!fromEntry) return null;
        return L.marker([fromEntry.lat, fromEntry.lng], { icon: GAP_ICON })
          .addTo(map)
          .bindPopup(
            `<b>⚠ Signal Gap</b><br>Duration: ${humanDuration(g.durationMs)}<br>Estimated missed: ${g.missedCount}`,
          );
      })
      .filter((m): m is L.Marker => m !== null);

    layersRef.current = {
      ...EMPTY_LAYERS(),
      glow: glowLine,
      path: polyline,
      markers: newMarkers,
      gapMarkers: newGapMarkers,
    };

    map.invalidateSize();
    setTimeout(
      () => map.fitBounds(polyline.getBounds(), { padding: [50, 50] }),
      50,
    );
  }, [entries, gaps]);

  // Highlight a single selected point
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const prev = layersRef.current.selected;
    if (prev) map.removeLayer(prev);
    layersRef.current.selected = null;

    if (selectedIndex == null || !entries[selectedIndex]) return;

    const e = entries[selectedIndex];
    const marker = L.circleMarker([e.lat, e.lng], {
      radius: 9,
      color: "#f59e0b",
      fillColor: "#fde68a",
      fillOpacity: 0.9,
      weight: 2,
    })
      .addTo(map)
      .bindPopup(
        `<b>Point #${selectedIndex + 1}</b><br>` +
          `Time: ${format(e.timestamp, "dd MMM yyyy, h:mm:ss a (HH:mm:ss)")}<br>` +
          `Speed: ${e.speed} m/s · ${e.moving ? "Moving" : "Stopped"}<br>` +
          `Accuracy: ${e.accuracy}m · Battery: ${e.batteryHealth ?? "?"}%`,
      )
      .openPopup();

    layersRef.current.selected = marker;
    map.setView([e.lat, e.lng], Math.max(map.getZoom(), 17));
  }, [selectedIndex, entries]);

  // Gap highlight — before/after points + dashed bridge
  useEffect(() => {
    const map = mapRef.current;
    layersRef.current.gapHighlight.forEach((l) => map?.removeLayer(l));
    layersRef.current.gapHighlight = [];

    if (!map || !selectedGap || !entries.length) return;

    const beforeEntry = [...entries]
      .reverse()
      .find((e) => e.timestamp <= selectedGap.from);
    const afterEntry = entries.find((e) => e.timestamp >= selectedGap.to);
    if (!beforeEntry || !afterEntry) return;

    const layers: L.Layer[] = [];

    layers.push(
      L.polyline(
        [
          [beforeEntry.lat, beforeEntry.lng],
          [afterEntry.lat, afterEntry.lng],
        ],
        {
          color: "#f97316",
          weight: 3,
          dashArray: "8 6",
          opacity: 0.9,
        },
      ).addTo(map),
    );
    layers.push(
      L.circleMarker([beforeEntry.lat, beforeEntry.lng], {
        radius: 11,
        color: "#f97316",
        fillColor: "#fed7aa",
        fillOpacity: 0.95,
        weight: 2,
      })
        .addTo(map)
        .bindPopup(
          `<b>⚠ Before Gap</b><br>Time: <b>${format(beforeEntry.timestamp, "dd MMM yyyy, h:mm:ss a (HH:mm:ss)")}</b><br>` +
            `Gap: <b style="color:#f97316">${humanDuration(selectedGap.durationMs)}</b> · ~${selectedGap.missedCount} missed`,
        )
        .openPopup(),
    );
    layers.push(
      L.circleMarker([afterEntry.lat, afterEntry.lng], {
        radius: 11,
        color: "#eab308",
        fillColor: "#fef08a",
        fillOpacity: 0.95,
        weight: 2,
      })
        .addTo(map)
        .bindPopup(
          `<b>▶ After Gap</b><br>Time: <b>${format(afterEntry.timestamp, "dd MMM yyyy, h:mm:ss a (HH:mm:ss)")}</b><br>` +
            `Resumed after <b style="color:#f97316">${humanDuration(selectedGap.durationMs)}</b>`,
        ),
    );

    layersRef.current.gapHighlight = layers;
    map.fitBounds(
      L.latLngBounds(
        [beforeEntry.lat, beforeEntry.lng],
        [afterEntry.lat, afterEntry.lng],
      ),
      { padding: [80, 80], maxZoom: 18 },
    );
  }, [selectedGap, entries]);

  // Playback rider marker + traveled path
  useEffect(() => {
    const map = mapRef.current;
    if (layersRef.current.rider) map?.removeLayer(layersRef.current.rider);
    if (layersRef.current.traveledGlow)
      map?.removeLayer(layersRef.current.traveledGlow);
    if (layersRef.current.traveledPath)
      map?.removeLayer(layersRef.current.traveledPath);
    layersRef.current.rider = null;
    layersRef.current.traveledGlow = null;
    layersRef.current.traveledPath = null;

    if (!map || playbackIndex == null || !entries[playbackIndex]) return;

    // Traveled portion — vivid orange overlaid on the blue route
    if (playbackIndex > 0) {
      const latlngs: L.LatLngTuple[] = entries
        .slice(0, playbackIndex + 1)
        .map((e) => [e.lat, e.lng]);
      layersRef.current.traveledGlow = L.polyline(latlngs, {
        color: "#fb923c",
        weight: 14,
        opacity: 0.22,
      }).addTo(map);
      layersRef.current.traveledPath = L.polyline(latlngs, {
        color: "#f97316",
        weight: 5,
        opacity: 1,
      }).addTo(map);
    }

    const e = entries[playbackIndex];
    const marker = L.marker([e.lat, e.lng], {
      icon: riderIcon(e.bearing),
      zIndexOffset: 1000,
    })
      .addTo(map)
      .bindPopup(
        `<b>🛵 Rider #${riderId ?? "?"}</b><br>` +
          `${format(e.timestamp, "dd MMM yyyy, h:mm:ss a (HH:mm:ss)")}<br>` +
          `${e.speed} m/s · ${e.moving ? "Moving" : "Stopped"}<br>` +
          `Battery: ${e.batteryHealth ?? "?"}%`,
      );

    layersRef.current.rider = marker;

    if (!map.getBounds().contains([e.lat, e.lng])) {
      map.panTo([e.lat, e.lng], { animate: true, duration: 0.5 });
    }
  }, [playbackIndex, entries]);

  // Custom location markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.customMarkers.forEach((m) => map.removeLayer(m));
    layersRef.current.customMarkers = [];

    const newMarkers: L.Layer[] = customLocations.map((loc) => {
      const isSelected = loc.id === selectedCustomId;
      const marker = L.marker([loc.lat, loc.lng], {
        icon: customLocationIcon(loc.color, loc.name, isSelected),
      })
        .addTo(map)
        .bindPopup(
          `<b style="color:${loc.color}">${loc.name}</b><br>` +
            `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`,
        );
      if (isSelected) {
        marker.openPopup();
        map.setView([loc.lat, loc.lng], Math.max(map.getZoom(), 16));
      }
      return marker;
    });

    layersRef.current.customMarkers = newMarkers;
  }, [customLocations, selectedCustomId]);

  return (
    <div
      style={{
        position: isFullscreen ? "fixed" : "relative",
        inset: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 2000 : undefined,
        height: isFullscreen ? "100vh" : "100%",
        width: isFullscreen ? "100vw" : "100%",
      }}
    >
      {riderId && (
        <div className="map-rider-badge">
          <span className="map-rider-icon">🛵</span>
          <span className="map-rider-label">Rider</span>
          <span className="map-rider-id">#{riderId}</span>
        </div>
      )}
      <div className="map-tile-toggle">
        <button
          className={`map-tile-btn ${tileProvider === "osm" ? "active" : ""}`}
          onClick={() => setTileProvider("osm")}
          title="OpenStreetMap"
        >
          OSM
        </button>
        <button
          className={`map-tile-btn ${tileProvider === "google" ? "active" : ""}`}
          onClick={() => setTileProvider("google")}
          title="Google Maps"
        >
          Google
        </button>
      </div>
      <button
        className="map-fs-btn"
        onClick={() => setIsFullscreen((f) => !f)}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      <div
        ref={containerRef}
        style={{
          height: "100%",
          width: "100%",
          borderRadius: isFullscreen ? 0 : "8px",
        }}
      />
    </div>
  );
}
