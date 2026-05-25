import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CATEGORY_ICON_SVGS } from "../assets/categoryIcons";
import { categories, getCategoryById } from "../data/categories";
import { IconLocate } from "./Icons";

const GREATER_VANCOUVER_CENTER = [-123.1207, 49.2827];

const INITIAL_MAP_ZOOM = 13.0;
const USER_LOCATION_ZOOM = 14.6;
const EVENT_FOCUS_ZOOM = 14.6;
const MAP_PITCH = 60;
const MAP_BEARING = -28;

const EVENT_SOURCE_ID = "event-points";

const EVENT_CLUSTER_LAYER_ID = "event-clusters";
const EVENT_CLUSTER_COUNT_LAYER_ID = "event-cluster-count";

const EVENT_LOCATION_GROUP_LAYER_ID = "event-location-groups";
const EVENT_LOCATION_GROUP_COUNT_LAYER_ID = "event-location-group-count";

const EVENT_SINGLE_DOT_LAYER_ID = "event-single-dots";
const EVENT_SINGLE_ICON_LAYER_ID = "event-single-icons";

const EVENT_SELECTED_SINGLE_DOT_LAYER_ID = "event-selected-single-dot";
const EVENT_SELECTED_SINGLE_ICON_LAYER_ID = "event-selected-single-icon";
const EVENT_SELECTED_LOCATION_GROUP_LAYER_ID = "event-selected-location-group";
const EVENT_SELECTED_LOCATION_GROUP_COUNT_LAYER_ID =
  "event-selected-location-group-count";
const EVENT_SELECTED_CLUSTER_LAYER_ID = "event-selected-cluster";
const EVENT_SELECTED_CLUSTER_COUNT_LAYER_ID = "event-selected-cluster-count";

const MAP_CATEGORY_ICON_SIZE = 24;

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Returns true when the fill is light enough that a white icon would be unreadable.
function isLightColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 186;
}

function normalizeLocationText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bstreet\b/g, "st")
    .replace(/\bst\.?\b/g, "st")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\bave\.?\b/g, "ave")
    .replace(/\broad\b/g, "rd")
    .replace(/\brd\.?\b/g, "rd")
    .replace(/\bboulevard\b/g, "blvd")
    .replace(/\bblvd\.?\b/g, "blvd")
    .replace(/\s+/g, " ")
    .trim();
}

function getLocationGroupKey(event) {
  const lat = Number(event.lat);
  const lng = Number(event.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "";
  }

  const venue = normalizeLocationText(event.venue);
  const city = normalizeLocationText(event.city);
  const address = normalizeLocationText(event.address);

  if (venue && city) {
    return `venue:${city}:${venue}`;
  }

  if (venue && address) {
    return `venue-address:${venue}:${address}`;
  }

  if (address && city) {
    return `address:${city}:${address}`;
  }

  return `coords:${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function getEventSortValue(event) {
  const date = event.event_date || event.eventDate || "";
  const time = event.start_time || event.rawStartTime || "23:59:59";
  const timestamp = new Date(`${date}T${time}`).getTime();

  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function groupEventsByExactLocation(events, selectedEvent) {
  const groupMap = new Map();

  events.forEach((event) => {
    const key = getLocationGroupKey(event);

    if (!key) return;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        lat: Number(event.lat),
        lng: Number(event.lng),
        events: [],
      });
    }

    groupMap.get(key).events.push(event);
  });

  return Array.from(groupMap.values()).map((group) => {
    const sortedEvents = [...group.events].sort(
      (a, b) => getEventSortValue(a) - getEventSortValue(b)
    );

    const firstVenue = sortedEvents[0]?.venue || "";
    const allSameVenue = sortedEvents.every(
      (event) => event.venue === firstVenue
    );

    const selected = selectedEvent
      ? sortedEvents.some((event) => String(event.id) === String(selectedEvent.id))
      : false;

    return {
      ...group,
      events: sortedEvents,
      primaryEvent: sortedEvents[0],
      venue: allSameVenue ? firstVenue : "Nearby events",
      selected,
    };
  });
}

function createEventGeoJson(events, selectedEvent) {
  const groups = groupEventsByExactLocation(events, selectedEvent);

  return {
    type: "FeatureCollection",
    features: groups.map((group) => {
      const primaryEvent = group.primaryEvent;
      const category = getCategoryById(primaryEvent?.category);
      const iconName = category.icon || "event";
      const eventIds = group.events.map((event) => String(event.id)).join("|");

      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [Number(group.lng), Number(group.lat)],
        },
        properties: {
          key: group.key,
          eventIds,
          primaryEventId: String(primaryEvent?.id ?? ""),
          eventCount: group.events.length,
          selected: group.selected ? 1 : 0,
          category: category.id || primaryEvent?.category || "event",
          categoryIcon: iconName,
          categoryHex: category.hex || "#ec4899",
          iconImage: `category-${iconName}`,
          selectedIconImage: `category-${iconName}-selected`,
          venue: group.venue || "This location",
        },
      };
    }),
  };
}

function getEventIdsFromFeature(feature) {
  return String(feature?.properties?.eventIds || "")
    .split("|")
    .map((id) => id.trim())
    .filter(Boolean);
}

function buildLocationGroupFromFeature(feature, events) {
  const eventIds = getEventIdsFromFeature(feature);
  const eventIdSet = new Set(eventIds);

  const groupEvents = events
    .filter((event) => eventIdSet.has(String(event.id)))
    .sort((a, b) => getEventSortValue(a) - getEventSortValue(b));

  if (groupEvents.length === 0) return null;

  return {
    key: feature.properties?.key || String(feature.id || ""),
    lat: Number(feature.geometry?.coordinates?.[1]),
    lng: Number(feature.geometry?.coordinates?.[0]),
    venue: feature.properties?.venue || groupEvents[0]?.venue || "Nearby events",
    events: groupEvents,
    primaryEvent: groupEvents[0],
    isAreaCluster: false,
  };
}

function createAreaGroupFromLeaves(leaves, events) {
  const eventIdSet = new Set();

  leaves.forEach((leaf) => {
    getEventIdsFromFeature(leaf).forEach((id) => eventIdSet.add(id));
  });

  const groupEvents = events
    .filter((event) => eventIdSet.has(String(event.id)))
    .sort((a, b) => getEventSortValue(a) - getEventSortValue(b));

  if (groupEvents.length === 0) return null;

  const lat =
    groupEvents.reduce((sum, event) => sum + Number(event.lat), 0) /
    groupEvents.length;

  const lng =
    groupEvents.reduce((sum, event) => sum + Number(event.lng), 0) /
    groupEvents.length;

  return {
    key: `cluster-${groupEvents.map((event) => event.id).join("-")}`,
    lat,
    lng,
    venue: "Nearby events",
    events: groupEvents,
    primaryEvent: groupEvents[0],
    isAreaCluster: true,
  };
}

function getClusterLeavesAsync(source, clusterId, limit = 1000, offset = 0) {
  return new Promise((resolve, reject) => {
    const maybePromise = source.getClusterLeaves(
      clusterId,
      limit,
      offset,
      (error, leaves) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(leaves || []);
      }
    );

    if (maybePromise?.then) {
      maybePromise.then(resolve).catch(reject);
    } else if (Array.isArray(maybePromise)) {
      resolve(maybePromise);
    }
  });
}

function getClusterExpansionZoomAsync(source, clusterId) {
  return new Promise((resolve, reject) => {
    const maybePromise = source.getClusterExpansionZoom(
      clusterId,
      (error, zoom) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(zoom);
      }
    );

    if (maybePromise?.then) {
      maybePromise.then(resolve).catch(reject);
    } else if (typeof maybePromise === "number") {
      resolve(maybePromise);
    }
  });
}

function createUserLocationElement() {
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.width = "36px";
  wrapper.style.height = "36px";
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.justifyContent = "center";

  // Animated pulse ring
  const pulse = document.createElement("div");
  pulse.style.position = "absolute";
  pulse.style.inset = "0";
  pulse.style.borderRadius = "9999px";
  pulse.style.background = "rgba(37, 99, 235, 0.18)";
  pulse.style.animation = "user-location-pulse 2s ease-out infinite";

  // Inner dot
  const dot = document.createElement("div");
  dot.style.position = "relative";
  dot.style.width = "16px";
  dot.style.height = "16px";
  dot.style.borderRadius = "9999px";
  dot.style.background = "#2563eb";
  dot.style.border = "3px solid white";
  dot.style.boxShadow = "0 2px 8px rgba(37, 99, 235, 0.5)";

  // Inject keyframe if not already present
  if (!document.getElementById("user-location-pulse-style")) {
    const style = document.createElement("style");
    style.id = "user-location-pulse-style";
    style.textContent = `
      @keyframes user-location-pulse {
        0%   { transform: scale(0.8); opacity: 0.8; }
        70%  { transform: scale(1.8); opacity: 0; }
        100% { transform: scale(0.8); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  wrapper.appendChild(pulse);
  wrapper.appendChild(dot);
  return wrapper;
}

function createDestinationLocationElement() {
  const wrapper = document.createElement("div");

  wrapper.style.position = "relative";
  wrapper.style.width = "34px";
  wrapper.style.height = "44px";
  wrapper.style.cursor = "pointer";
  wrapper.style.filter = "drop-shadow(0 8px 14px rgba(15, 23, 42, 0.28))";

  wrapper.innerHTML = `
    <div
      style="
        position: absolute;
        left: 50%;
        top: 0;
        width: 34px;
        height: 34px;
        transform: translateX(-50%) rotate(-45deg);
        border-radius: 9999px 9999px 9999px 0;
        background: #ef4444;
        border: 3px solid white;
        box-shadow: 0 0 0 5px rgba(239, 68, 68, 0.14);
      "
    >
      <div
        style="
          position: absolute;
          left: 50%;
          top: 50%;
          width: 11px;
          height: 11px;
          transform: translate(-50%, -50%);
          border-radius: 9999px;
          background: white;
        "
      ></div>
    </div>
  `;

  return wrapper;
}

function colorizeSvg(svg, color) {
  let output = svg;

  output = output.replaceAll("currentColor", color);

  if (!output.includes("xmlns=")) {
    output = output.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  if (!output.includes("width=")) {
    output = output.replace("<svg", '<svg width="64"');
  }

  if (!output.includes("height=")) {
    output = output.replace("<svg", '<svg height="64"');
  }

  return output;
}

function svgToImageData(svg, size = MAP_CATEGORY_ICON_SIZE) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;

      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Could not create canvas context for map icon."));
        return;
      }

      context.clearRect(0, 0, size, size);
      context.drawImage(image, 0, 0, size, size);

      resolve(context.getImageData(0, 0, size, size));
    };

    image.onerror = reject;
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

async function addCategoryIconImages(map) {
  const iconEntries = Object.entries(CATEGORY_ICON_SVGS);

  await Promise.all(
    iconEntries.flatMap(([iconName, svg]) => {
      const normalImageName = `category-${iconName}`;
      const selectedImageName = `category-${iconName}-selected`;

      const normalSvg = colorizeSvg(svg, "#ffffff");
      const selectedSvg = colorizeSvg(svg, "#ffffff");

      return [
        svgToImageData(normalSvg).then((image) => {
          if (!map.hasImage(normalImageName)) {
            map.addImage(normalImageName, image, {
              pixelRatio: 2,
            });
          }
        }),
        svgToImageData(selectedSvg).then((image) => {
          if (!map.hasImage(selectedImageName)) {
            map.addImage(selectedImageName, image, {
              pixelRatio: 2,
            });
          }
        }),
      ];
    })
  );

  if (!map.hasImage("category-event")) {
    const fallbackSvg =
      CATEGORY_ICON_SVGS.event ||
      `<svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none" />
      </svg>`;

    const image = await svgToImageData(colorizeSvg(fallbackSvg, "#ffffff"));
    map.addImage("category-event", image, {
      pixelRatio: 2,
    });
  }

  if (!map.hasImage("category-event-selected")) {
    const fallbackSvg =
      CATEGORY_ICON_SVGS.event ||
      `<svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none" />
      </svg>`;

    const image = await svgToImageData(colorizeSvg(fallbackSvg, "#ffffff"));
    map.addImage("category-event-selected", image, {
      pixelRatio: 2,
    });
  }
}

const MAX_BADGE_IMAGE_COUNT = 500;
const BADGE_IMAGE_PIXEL_RATIO = 2;

function clampBadgeCount(count) {
  const numericCount = Number(count);

  if (!Number.isFinite(numericCount)) {
    return 1;
  }

  return Math.max(1, Math.min(MAX_BADGE_IMAGE_COUNT, Math.round(numericCount)));
}

function getCountBadgeImageName(count, isSelected = false) {
  const prefix = isSelected ? "event-badge-selected" : "event-badge";
  return `${prefix}-${clampBadgeCount(count)}`;
}

function getBadgeRadius(count, isSelected = false) {
  const numericCount = clampBadgeCount(count);

  if (isSelected) {
    if (numericCount >= 40) return 40;
    if (numericCount >= 20) return 33;
    if (numericCount >= 10) return 27;
    if (numericCount >= 5) return 22;
    return 18;
  }

  if (numericCount >= 40) return 38;
  if (numericCount >= 20) return 31;
  if (numericCount >= 10) return 25;
  if (numericCount >= 5) return 20;
  return 16;
}

function createCountBadgeImage(count, isSelected = false) {
  const radius = getBadgeRadius(count, isSelected);
  const strokeWidth = isSelected ? 4 : 3;
  const padding = 12;
  const displaySize = Math.ceil((radius + strokeWidth + padding) * 2);
  const canvas = document.createElement("canvas");

  canvas.width = displaySize * BADGE_IMAGE_PIXEL_RATIO;
  canvas.height = displaySize * BADGE_IMAGE_PIXEL_RATIO;

  const context = canvas.getContext("2d");
  context.scale(BADGE_IMAGE_PIXEL_RATIO, BADGE_IMAGE_PIXEL_RATIO);

  const center = displaySize / 2;
  const fillColor = isSelected ? "#d42f7a" : "#F5569B";

  // Vivid glow shadow
  context.save();
  context.shadowColor = isSelected ? "rgba(212, 47, 122, 0.6)" : "rgba(245, 86, 155, 0.5)";
  context.shadowBlur = isSelected ? 16 : 12;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 3;
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.fillStyle = fillColor;
  context.fill();
  context.restore();

  // Solid fill
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.fillStyle = fillColor;
  context.fill();

  // White ring
  context.lineWidth = strokeWidth;
  context.strokeStyle = "#ffffff";
  context.stroke();

  // Count label
  const fontSize = radius >= 30 ? 17 : radius >= 24 ? 15 : 13;
  context.font = `900 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(clampBadgeCount(count)), center, center + 0.5);

  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function addCountBadgeImages(map) {
  for (let count = 1; count <= MAX_BADGE_IMAGE_COUNT; count += 1) {
    const normalName = getCountBadgeImageName(count, false);
    const selectedName = getCountBadgeImageName(count, true);

    if (!map.hasImage(normalName)) {
      map.addImage(normalName, createCountBadgeImage(count, false), {
        pixelRatio: BADGE_IMAGE_PIXEL_RATIO,
      });
    }

    if (!map.hasImage(selectedName)) {
      map.addImage(selectedName, createCountBadgeImage(count, true), {
        pixelRatio: BADGE_IMAGE_PIXEL_RATIO,
      });
    }
  }
}

function drawPinShape(ctx, cx, bubbleCY, bubbleR, tipY, tailBaseHalf) {
  const safeHalf = Math.min(tailBaseHalf, bubbleR * 0.9);
  const halfAngle = Math.asin(safeHalf / bubbleR);
  ctx.beginPath();
  ctx.arc(cx, bubbleCY, bubbleR, Math.PI / 2 + halfAngle, Math.PI / 2 - halfAngle, false);
  ctx.lineTo(cx, tipY);
  ctx.closePath();
}

async function createPinMarkerImage(categoryHex, iconSvg, isSelected) {
  const PIXEL_RATIO = 2;
  const bubbleR = isSelected ? 24 : 18;
  const strokeW = isSelected ? 4 : 3;
  const tailH = isSelected ? 14 : 12;
  const tailBaseHalf = isSelected ? 7 : 6;
  const padTop = isSelected ? 12 : 10;
  const padSide = isSelected ? 12 : 10;

  const canvasW = (bubbleR + padSide) * 2;
  const canvasH = padTop + bubbleR * 2 + tailH;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW * PIXEL_RATIO;
  canvas.height = canvasH * PIXEL_RATIO;

  const ctx = canvas.getContext("2d");
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);

  const cx = canvasW / 2;
  const cy = padTop + bubbleR;
  const tipY = canvasH;

  // Drop shadow — tinted with category color for identity; blue for selected glow
  ctx.save();
  ctx.shadowColor = isSelected
    ? "rgba(37, 99, 235, 0.45)"
    : hexToRgba(categoryHex, 0.30);
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  drawPinShape(ctx, cx, cy, bubbleR, tipY, tailBaseHalf);
  ctx.fillStyle = isSelected ? "#2563eb" : categoryHex;
  ctx.fill();
  ctx.restore();

  // White outer ring
  drawPinShape(ctx, cx, cy, bubbleR, tipY, tailBaseHalf);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Colored inner fill
  drawPinShape(ctx, cx, cy, bubbleR - strokeW, tipY, tailBaseHalf - 1.5);
  ctx.fillStyle = isSelected ? "#2563eb" : categoryHex;
  ctx.fill();

  // Icon — dark on light fills (e.g. yellow), white on saturated/dark fills; selected always white
  if (iconSvg) {
    try {
      const iconFill = isSelected ? "#ffffff" : (isLightColor(categoryHex) ? "#111827" : "#ffffff");
      const coloredSvg = colorizeSvg(iconSvg, iconFill);
      const iconSize = isSelected ? 20 : 16;
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(coloredSvg)}`;
      });
      ctx.drawImage(img, cx - iconSize / 2, cy - iconSize / 2, iconSize, iconSize);
    } catch {
      // icon unavailable — pin still renders with colored bubble
    }
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

async function addPinMarkerImages(map) {
  const fallbackSvg = CATEGORY_ICON_SVGS.event ||
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none"/></svg>`;

  await Promise.all(
    categories.map(async (category) => {
      const iconSvg = CATEGORY_ICON_SVGS[category.icon] || fallbackSvg;
      const hex = category.hex || "#ec4899";
      const normalName = `pin-${category.id}`;
      const selectedName = `pin-${category.id}-selected`;

      const [normalImg, selectedImg] = await Promise.all([
        createPinMarkerImage(hex, iconSvg, false),
        createPinMarkerImage(hex, iconSvg, true),
      ]);

      if (!map.hasImage(normalName)) {
        map.addImage(normalName, normalImg, { pixelRatio: BADGE_IMAGE_PIXEL_RATIO });
      }
      if (!map.hasImage(selectedName)) {
        map.addImage(selectedName, selectedImg, { pixelRatio: BADGE_IMAGE_PIXEL_RATIO });
      }
    })
  );

  // Fallback pin for unknown categories
  if (!map.hasImage("pin-event")) {
    const img = await createPinMarkerImage("#ec4899", fallbackSvg, false);
    map.addImage("pin-event", img, { pixelRatio: BADGE_IMAGE_PIXEL_RATIO });
  }
  if (!map.hasImage("pin-event-selected")) {
    const img = await createPinMarkerImage("#ec4899", fallbackSvg, true);
    map.addImage("pin-event-selected", img, { pixelRatio: BADGE_IMAGE_PIXEL_RATIO });
  }
}

function addEventLayers(map) {
  if (map.getSource(EVENT_SOURCE_ID)) return;

  addCountBadgeImages(map);

  map.addSource(EVENT_SOURCE_ID, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 56,
    clusterProperties: {
      event_count: ["+", ["get", "eventCount"]],
      selected_count: ["+", ["get", "selected"]],
    },
  });

  // Outer glow backdrop behind selected pin bubble
  map.addLayer({
    id: "event-selected-single-glow",
    type: "circle",
    source: EVENT_SOURCE_ID,
    filter: [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "eventCount"], 1],
      ["==", ["get", "selected"], 1],
    ],
    paint: {
      "circle-color": "rgba(37, 99, 235, 0.22)",
      "circle-radius": 38,
      "circle-blur": 0.55,
      "circle-stroke-width": 0,
      "circle-opacity": 1,
      "circle-translate": [0, -38],
      "circle-translate-anchor": "viewport",
    },
  });

  // Animated pulse ring (radius/opacity driven by requestAnimationFrame)
  map.addLayer({
    id: "event-selected-pulse-ring",
    type: "circle",
    source: EVENT_SOURCE_ID,
    filter: [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "eventCount"], 1],
      ["==", ["get", "selected"], 1],
    ],
    paint: {
      "circle-color": "rgba(0,0,0,0)",
      "circle-radius": 22,
      "circle-stroke-color": "rgba(59, 130, 246, 0.70)",
      "circle-stroke-width": 2.5,
      "circle-stroke-opacity": 0.5,
      "circle-opacity": 0,
      "circle-translate": [0, -38],
      "circle-translate-anchor": "viewport",
    },
  });

  // Solid ring border around selected pin bubble
  map.addLayer({
    id: "event-selected-single-ring",
    type: "circle",
    source: EVENT_SOURCE_ID,
    filter: [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "eventCount"], 1],
      ["==", ["get", "selected"], 1],
    ],
    paint: {
      "circle-color": "rgba(0, 0, 0, 0)",
      "circle-radius": 26,
      "circle-stroke-color": "rgba(37, 99, 235, 0.55)",
      "circle-stroke-width": 2,
      "circle-stroke-opacity": 1,
      "circle-opacity": 0,
      "circle-translate": [0, -38],
      "circle-translate-anchor": "viewport",
    },
  });

  // Single-event pin markers — baked canvas: shadow + white ring + colored bubble + icon
  map.addLayer({
    id: EVENT_SINGLE_DOT_LAYER_ID,
    type: "symbol",
    source: EVENT_SOURCE_ID,
    filter: [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "eventCount"], 1],
    ],
    layout: {
      "icon-image": [
        "case",
        ["==", ["get", "selected"], 1],
        ["concat", "pin-", ["get", "category"], "-selected"],
        ["concat", "pin-", ["get", "category"]],
      ],
      "icon-size": 1,
      "icon-anchor": "bottom",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });

  map.addLayer({
    id: EVENT_LOCATION_GROUP_LAYER_ID,
    type: "symbol",
    source: EVENT_SOURCE_ID,
    filter: [
      "all",
      ["!", ["has", "point_count"]],
      [">", ["get", "eventCount"], 1],
    ],
    layout: {
      "icon-image": [
        "case",
        ["==", ["get", "selected"], 1],
        ["concat", "event-badge-selected-", ["to-string", ["get", "eventCount"]]],
        ["concat", "event-badge-", ["to-string", ["get", "eventCount"]]],
      ],
      "icon-size": 1,
      "icon-anchor": "center",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });

  map.addLayer({
    id: "event-location-group-venue-label",
    type: "symbol",
    source: EVENT_SOURCE_ID,
    filter: [
      "all",
      ["!", ["has", "point_count"]],
      [">", ["get", "eventCount"], 1],
    ],
    layout: {
      "text-field": ["get", "venue"],
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-size": 11,
      "text-anchor": "bottom",
      "text-offset": [0, -2.4],
      "text-max-width": 10,
      "text-allow-overlap": false,
      "text-ignore-placement": false,
    },
    paint: {
      "text-color": "#F5569B",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5,
    },
  });

  // Invisible hit area kept for existing click/hover handlers.
  map.addLayer({
    id: EVENT_LOCATION_GROUP_COUNT_LAYER_ID,
    type: "circle",
    source: EVENT_SOURCE_ID,
    filter: [
      "all",
      ["!", ["has", "point_count"]],
      [">", ["get", "eventCount"], 1],
    ],
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "eventCount"],
        2,
        16,
        5,
        20,
        10,
        25,
        20,
        31,
        40,
        38,
      ],
      "circle-color": "rgba(0, 0, 0, 0)",
      "circle-stroke-color": "rgba(0, 0, 0, 0)",
      "circle-opacity": 0,
      "circle-stroke-opacity": 0,
    },
  });

  map.addLayer({
    id: EVENT_CLUSTER_LAYER_ID,
    type: "symbol",
    source: EVENT_SOURCE_ID,
    filter: ["has", "point_count"],
    layout: {
      "icon-image": [
        "case",
        [">", ["coalesce", ["get", "selected_count"], 0], 0],
        [
          "concat",
          "event-badge-selected-",
          ["to-string", ["coalesce", ["get", "event_count"], ["get", "point_count"]]],
        ],
        [
          "concat",
          "event-badge-",
          ["to-string", ["coalesce", ["get", "event_count"], ["get", "point_count"]]],
        ],
      ],
      "icon-size": 1,
      "icon-anchor": "center",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });

  // Invisible hit area kept for existing click/hover handlers.
  map.addLayer({
    id: EVENT_CLUSTER_COUNT_LAYER_ID,
    type: "circle",
    source: EVENT_SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "event_count"], ["get", "point_count"]],
        2,
        16,
        5,
        20,
        10,
        25,
        20,
        31,
        40,
        38,
      ],
      "circle-color": "rgba(0, 0, 0, 0)",
      "circle-stroke-color": "rgba(0, 0, 0, 0)",
      "circle-opacity": 0,
      "circle-stroke-opacity": 0,
    },
  });
}

export default function EventMap({
  events,
  selectedEvent,
  onSelectEvent,
  onSelectLocationGroup,
  onClearSelection,
  onMapBackgroundClick,
  userLocation,
  destinationLocation,
  onLocate,
  isLocating = false,
}) {
  const [isMapReady, setIsMapReady] = useState(false);
  const [is3dMode, setIs3dMode] = useState(true);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const suppressNextSelectedFlyRef = useRef(false);
  const glowAnimRef = useRef(null);

  const eventsRef = useRef(events);
  const onSelectEventRef = useRef(onSelectEvent);
  const onSelectLocationGroupRef = useRef(onSelectLocationGroup);
  const onClearSelectionRef = useRef(onClearSelection);
  const onMapBackgroundClickRef = useRef(onMapBackgroundClick);

  const eventGeoJson = useMemo(() => {
    return createEventGeoJson(events, selectedEvent);
  }, [events, selectedEvent]);

  const eventGeoJsonRef = useRef(eventGeoJson);

  useEffect(() => {
    eventsRef.current = events;
    onSelectEventRef.current = onSelectEvent;
    onSelectLocationGroupRef.current = onSelectLocationGroup;
    onClearSelectionRef.current = onClearSelection;
    onMapBackgroundClickRef.current = onMapBackgroundClick;
    eventGeoJsonRef.current = eventGeoJson;

    const map = mapRef.current;
    const source = map?.getSource(EVENT_SOURCE_ID);

    if (source?.setData) {
      source.setData(eventGeoJson);
    }
  }, [
    events,
    onSelectEvent,
    onSelectLocationGroup,
    onClearSelection,
    onMapBackgroundClick,
    eventGeoJson,
  ]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: GREATER_VANCOUVER_CENTER,
      zoom: INITIAL_MAP_ZOOM,
      minZoom: 9,
      maxZoom: 18,
      pitch: MAP_PITCH,
      bearing: MAP_BEARING,
      attributionControl: false,
      antialias: true,
    });

    mapRef.current = map;

    map.scrollZoom.setZoomRate(1 / 25);
    map.scrollZoom.setWheelZoomRate(1 / 150);

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
      }),
      "bottom-right"
    );

    const setPointerCursor = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    const clearPointerCursor = () => {
      map.getCanvas().style.cursor = "";
    };

    const handleClusterClick = async (event) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      const coordinates = feature?.geometry?.coordinates;

      if (!feature || clusterId === undefined || !coordinates) return;

      const source = map.getSource(EVENT_SOURCE_ID);

      try {
        const leaves = await getClusterLeavesAsync(source, clusterId);
        const group = createAreaGroupFromLeaves(leaves, eventsRef.current);

        if (group && onSelectLocationGroupRef.current) {
          suppressNextSelectedFlyRef.current = true;
          onSelectLocationGroupRef.current(group);
        }

        const expansionZoom = await getClusterExpansionZoomAsync(
          source,
          clusterId
        );

        const currentZoom = map.getZoom();
        const targetZoom = Math.min(expansionZoom, currentZoom + 1.7, 15);

        map.easeTo({
          center: coordinates,
          zoom: targetZoom,
          pitch: MAP_PITCH,
          bearing: MAP_BEARING,
          duration: 650,
        });
      } catch (error) {
        console.error("Could not expand event cluster:", error);
      }
    };

    const handleGroupClick = (event) => {
      const feature = event.features?.[0];

      if (!feature) return;

      const group = buildLocationGroupFromFeature(feature, eventsRef.current);

      if (!group) return;

      if (group.events.length > 1 && onSelectLocationGroupRef.current) {
        suppressNextSelectedFlyRef.current = true;
        onSelectLocationGroupRef.current(group);

        const currentZoom = map.getZoom();
        const targetZoom = Math.max(currentZoom, Math.min(currentZoom + 1.4, 14));

        map.easeTo({
          center: [Number(group.lng), Number(group.lat)],
          zoom: targetZoom,
          pitch: MAP_PITCH,
          bearing: MAP_BEARING,
          duration: 550,
        });

        return;
      }

      onSelectEventRef.current?.(group.primaryEvent);
    };

    const handleSingleClick = (event) => {
      const feature = event.features?.[0];

      if (!feature) return;

      const group = buildLocationGroupFromFeature(feature, eventsRef.current);

      if (!group?.primaryEvent) return;

      onSelectEventRef.current?.(group.primaryEvent);
    };

    let backgroundPointerStart = null;

    const isEventFeatureAtPoint = (point) => {
      const interactiveLayers = [
        EVENT_CLUSTER_LAYER_ID,
        EVENT_CLUSTER_COUNT_LAYER_ID,
        EVENT_LOCATION_GROUP_LAYER_ID,
        EVENT_LOCATION_GROUP_COUNT_LAYER_ID,
        EVENT_SINGLE_DOT_LAYER_ID,
        "event-selected-single-glow",
        "event-selected-single-ring",
      ].filter((layerId) => map.getLayer(layerId));

      if (interactiveLayers.length === 0) {
        return false;
      }

      const clickedEventFeatures = map.queryRenderedFeatures(point, {
        layers: interactiveLayers,
      });

      return clickedEventFeatures.length > 0;
    };

    const handleMapBackgroundPointerDown = (event) => {
      backgroundPointerStart = event.point;
    };

    const handleMapBackgroundPointerUp = (event) => {
      if (!backgroundPointerStart) {
        return;
      }

      const deltaX = event.point.x - backgroundPointerStart.x;
      const deltaY = event.point.y - backgroundPointerStart.y;
      const movedDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      backgroundPointerStart = null;

      if (movedDistance > 6) {
        return;
      }

      if (isEventFeatureAtPoint(event.point)) {
        return;
      }

      onClearSelectionRef.current?.();
      onMapBackgroundClickRef.current?.();
    };

    const bindEventLayerHandlers = async () => {
      try {
        await addPinMarkerImages(map);
      } catch (error) {
        console.error("Could not load pin marker images:", error);
      }

      // Inject 3D building extrusions before event marker layers
      try {
        const mapStyle = map.getStyle();
        const firstSymbolLayer = mapStyle.layers.find((l) => l.type === "symbol");
        const insertBefore = firstSymbolLayer?.id;

        if (!map.getLayer("buildings-3d") && map.getSource("openmaptiles")) {
          map.addLayer(
            {
              id: "buildings-3d",
              source: "openmaptiles",
              "source-layer": "building",
              type: "fill-extrusion",
              minzoom: 13,
              paint: {
                "fill-extrusion-color": [
                  "interpolate",
                  ["linear"],
                  ["coalesce", ["get", "render_height"], 0],
                  0, "#f8fafc",
                  20, "#f1f5f9",
                  50, "#e2e8f0",
                  100, "#cbd5e1",
                ],
                "fill-extrusion-height": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  13, 0,
                  14, ["coalesce", ["get", "render_height"], 3],
                ],
                "fill-extrusion-base": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  13, 0,
                  14, ["coalesce", ["get", "render_min_height"], 0],
                ],
                "fill-extrusion-opacity": 0.82,
                "fill-extrusion-vertical-gradient": true,
              },
            },
            insertBefore
          );
        }
      } catch (buildingError) {
        console.info("3D buildings unavailable:", buildingError.message);
      }

      addEventLayers(map);

      const source = map.getSource(EVENT_SOURCE_ID);

      if (source?.setData) {
        source.setData(eventGeoJsonRef.current);
      }

      map.on("click", EVENT_CLUSTER_LAYER_ID, handleClusterClick);
      map.on("click", EVENT_CLUSTER_COUNT_LAYER_ID, handleClusterClick);

      map.on("click", EVENT_LOCATION_GROUP_LAYER_ID, handleGroupClick);
      map.on("click", EVENT_LOCATION_GROUP_COUNT_LAYER_ID, handleGroupClick);

      map.on("click", EVENT_SINGLE_DOT_LAYER_ID, handleSingleClick);
      map.on("mousedown", handleMapBackgroundPointerDown);
      map.on("mouseup", handleMapBackgroundPointerUp);

      [
        EVENT_CLUSTER_LAYER_ID,
        EVENT_CLUSTER_COUNT_LAYER_ID,
        EVENT_LOCATION_GROUP_LAYER_ID,
        EVENT_LOCATION_GROUP_COUNT_LAYER_ID,
        EVENT_SINGLE_DOT_LAYER_ID,
      ].forEach((layerId) => {
        map.on("mouseenter", layerId, setPointerCursor);
        map.on("mouseleave", layerId, clearPointerCursor);
      });

      setIsMapReady(true);
    };

    map.on("load", bindEventLayerHandlers);

    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }

      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.remove();
        destinationMarkerRef.current = null;
      }

      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const source = map.getSource(EVENT_SOURCE_ID);

    if (source?.setData) {
      source.setData(eventGeoJson);
    }
  }, [eventGeoJson, isMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedEvent?.lat || !selectedEvent?.lng) return;

    if (suppressNextSelectedFlyRef.current) {
      suppressNextSelectedFlyRef.current = false;
      return;
    }

    const lng = Number(selectedEvent.lng);
    const lat = Number(selectedEvent.lat);

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

    map.flyTo({
      center: [lng, lat],
      zoom: EVENT_FOCUS_ZOOM,
      pitch: MAP_PITCH,
      bearing: MAP_BEARING,
      speed: 1.4,
      curve: 1.2,
      essential: true,
    });
  }, [selectedEvent]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (!userLocation?.lat || !userLocation?.lng) return;

    const lng = Number(userLocation.lng);
    const lat = Number(userLocation.lat);

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

    const popup = new maplibregl.Popup({
      offset: 18,
      closeButton: false,
    }).setText("You are here");

    userMarkerRef.current = new maplibregl.Marker({
      element: createUserLocationElement(),
      anchor: "center",
    })
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map);

    map.flyTo({
      center: [lng, lat],
      zoom: USER_LOCATION_ZOOM,
      pitch: MAP_PITCH,
      bearing: MAP_BEARING,
      speed: 1.4,
      curve: 1.2,
      essential: true,
    });
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    if (!destinationLocation?.lat || !destinationLocation?.lng) return;

    const lng = Number(destinationLocation.lng);
    const lat = Number(destinationLocation.lat);

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

    const popup = new maplibregl.Popup({
      offset: 18,
      closeButton: false,
    }).setHTML(`
      <div style="min-width: 180px;">
        <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b;">
          Reference location
        </p>
        <p style="margin: 0; font-size: 13px; font-weight: 800; color: #0f172a;">
          ${destinationLocation.shortLabel || "Selected location"}
        </p>
      </div>
    `);

    destinationMarkerRef.current = new maplibregl.Marker({
      element: createDestinationLocationElement(),
      anchor: "bottom",
    })
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map);

    map.flyTo({
      center: [lng, lat],
      zoom: EVENT_FOCUS_ZOOM,
      pitch: MAP_PITCH,
      bearing: MAP_BEARING,
      speed: 1.6,
      curve: 1.15,
      essential: true,
    });
  }, [destinationLocation]);

  // Pulse-ring animation for the selected marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    function stopAnim() {
      if (glowAnimRef.current) {
        cancelAnimationFrame(glowAnimRef.current);
        glowAnimRef.current = null;
      }
    }

    if (!selectedEvent) {
      stopAnim();
      return;
    }

    function frame() {
      if (!map.getLayer("event-selected-pulse-ring")) return;
      const t = (Date.now() % 2200) / 2200;
      const ease = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
      map.setPaintProperty("event-selected-pulse-ring", "circle-radius", 22 + ease * 20);
      map.setPaintProperty("event-selected-pulse-ring", "circle-stroke-opacity", 0.65 * (1 - ease));
      glowAnimRef.current = requestAnimationFrame(frame);
    }

    stopAnim();
    glowAnimRef.current = requestAnimationFrame(frame);
    return stopAnim;
  }, [selectedEvent, isMapReady]);

  function handleToggle3d() {
    const map = mapRef.current;
    if (!map) return;
    const newMode = !is3dMode;
    setIs3dMode(newMode);
    map.easeTo({
      pitch: newMode ? MAP_PITCH : 0,
      bearing: newMode ? MAP_BEARING : 0,
      duration: 600,
    });
  }

  return (
    <>
      <section
        className="absolute inset-0 z-0 overflow-hidden"
        aria-label="Greater Vancouver event map"
      >
        <div ref={mapContainerRef} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-rose-50/25 via-transparent to-white/10" />
      </section>

      {isMapReady && (
        <div className="absolute right-4 top-44 z-[60] flex flex-col items-center gap-2 lg:top-[68px]">
          {/* Locate */}
          <button
            type="button"
            onClick={onLocate}
            disabled={isLocating}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/97 text-slate-600 shadow-md shadow-slate-900/12 ring-1 ring-slate-200/70 transition hover:bg-slate-900 hover:text-white hover:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Use current location"
            title="Use current location"
          >
            {isLocating ? (
              <span className="text-xs font-black">…</span>
            ) : (
              <IconLocate className="h-4 w-4" />
            )}
          </button>

          {/* Zoom +/- — grouped in one card */}
          <div className="flex flex-col overflow-hidden rounded-xl bg-white/97 shadow-md shadow-slate-900/12 ring-1 ring-slate-200/70">
            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn()}
              className="flex h-9 w-9 items-center justify-center text-lg font-bold text-slate-600 transition hover:bg-slate-900 hover:text-white"
              aria-label="Zoom in"
            >
              +
            </button>
            <div className="mx-1.5 h-px bg-slate-100" />
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut()}
              className="flex h-9 w-9 items-center justify-center text-lg font-bold text-slate-600 transition hover:bg-slate-900 hover:text-white"
              aria-label="Zoom out"
            >
              −
            </button>
          </div>

          {/* 3D toggle */}
          <button
            type="button"
            onClick={handleToggle3d}
            className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black shadow-md shadow-slate-900/12 ring-1 transition ${
              is3dMode
                ? "bg-[#F5569B] text-white ring-pink-400/40 shadow-pink-400/25"
                : "bg-white/97 text-slate-500 ring-slate-200/70 hover:bg-[#F5569B] hover:text-white hover:ring-pink-400/40"
            }`}
            aria-label="Toggle 3D view"
            title={is3dMode ? "Switch to flat view" : "Switch to 3D view"}
          >
            3D
          </button>
        </div>
      )}
    </>
  );
}