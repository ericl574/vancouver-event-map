import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getCategoryById } from "../data/categories";

const GREATER_VANCOUVER_CENTER = [-123.1162, 49.2463];

const EVENT_SOURCE_ID = "event-points";
const EVENT_CLUSTER_LAYER_ID = "event-clusters";
const EVENT_CLUSTER_COUNT_LAYER_ID = "event-cluster-count";
const EVENT_LOCATION_GROUP_LAYER_ID = "event-location-groups";
const EVENT_LOCATION_GROUP_COUNT_LAYER_ID = "event-location-group-count";
const EVENT_SINGLE_BG_LAYER_ID = "event-single-bg";
const EVENT_SINGLE_ICON_LAYER_ID = "event-single-icon";

function getLocationGroupKey(event) {
  const lat = Number(event.lat);
  const lng = Number(event.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "";
  }

  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
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
    const allSameVenue = sortedEvents.every((event) => event.venue === firstVenue);
    const selected = sortedEvents.some((event) => event.id === selectedEvent?.id);

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
      const eventIds = group.events.map((event) => String(event.id)).join("|");

      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [group.lng, group.lat],
        },
        properties: {
          key: group.key,
          eventIds,
          primaryEventId: String(primaryEvent?.id ?? ""),
          eventCount: group.events.length,
          selected: group.selected ? 1 : 0,
          category: category.id || primaryEvent?.category || "event",
          categoryIcon: category.icon || "event",
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
  const marker = document.createElement("div");

  marker.style.width = "22px";
  marker.style.height = "22px";
  marker.style.borderRadius = "9999px";
  marker.style.background = "#2563eb";
  marker.style.border = "4px solid white";
  marker.style.boxShadow = "0 0 0 8px rgba(37, 99, 235, 0.2)";

  return marker;
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

function addEventLayers(map) {
  if (map.getSource(EVENT_SOURCE_ID)) return;

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

  map.addLayer({
    id: EVENT_CLUSTER_LAYER_ID,
    type: "circle",
    source: EVENT_SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "case",
        [">", ["coalesce", ["get", "selected_count"], 0], 0],
        "#ef4444",
        "#2563eb",
      ],
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "event_count"], ["get", "point_count"]],
        2,
        18,
        5,
        23,
        10,
        30,
        20,
        39,
        40,
        52,
      ],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3,
      "circle-opacity": 0.96,
    },
  });

  map.addLayer({
    id: EVENT_CLUSTER_COUNT_LAYER_ID,
    type: "symbol",
    source: EVENT_SOURCE_ID,
    filter: ["has", "point_count"],
    layout: {
      "text-field": [
        "to-string",
        ["coalesce", ["get", "event_count"], ["get", "point_count"]],
      ],
      "text-size": [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "event_count"], ["get", "point_count"]],
        2,
        12,
        10,
        14,
        20,
        16,
      ],
      "text-font": ["Noto Sans Bold"],
    },
    paint: {
      "text-color": "#ffffff",
    },
  });

  map.addLayer({
    id: EVENT_LOCATION_GROUP_LAYER_ID,
    type: "circle",
    source: EVENT_SOURCE_ID,
    filter: ["all", ["!", ["has", "point_count"]], [">", ["get", "eventCount"], 1]],
    paint: {
      "circle-color": [
        "case",
        ["==", ["get", "selected"], 1],
        "#ef4444",
        "#2563eb",
      ],
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "eventCount"],
        2,
        18,
        5,
        23,
        10,
        30,
        20,
        39,
      ],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3,
      "circle-opacity": 0.97,
    },
  });

  map.addLayer({
    id: EVENT_LOCATION_GROUP_COUNT_LAYER_ID,
    type: "symbol",
    source: EVENT_SOURCE_ID,
    filter: ["all", ["!", ["has", "point_count"]], [">", ["get", "eventCount"], 1]],
    layout: {
      "text-field": ["to-string", ["get", "eventCount"]],
      "text-size": [
        "interpolate",
        ["linear"],
        ["get", "eventCount"],
        2,
        12,
        10,
        14,
        20,
        16,
      ],
      "text-font": ["Noto Sans Bold"],
    },
    paint: {
      "text-color": "#ffffff",
    },
  });

  map.addLayer({
    id: EVENT_SINGLE_BG_LAYER_ID,
    type: "circle",
    source: EVENT_SOURCE_ID,
    filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "eventCount"], 1]],
    paint: {
      "circle-color": "rgba(255, 255, 255, 0.97)",
      "circle-radius": ["case", ["==", ["get", "selected"], 1], 16, 14],
      "circle-stroke-color": [
        "case",
        ["==", ["get", "selected"], 1],
        "#ef4444",
        "#ffffff",
      ],
      "circle-stroke-width": ["case", ["==", ["get", "selected"], 1], 4, 2],
      "circle-opacity": 0.98,
    },
  });

  map.addLayer({
    id: EVENT_SINGLE_ICON_LAYER_ID,
    type: "symbol",
    source: EVENT_SOURCE_ID,
    filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "eventCount"], 1]],
    layout: {
      "text-field": [
        "match",
        ["get", "category"],
        "music",
        "♪",
        "festival",
        "✦",
        "comedy",
        "☺",
        "art",
        "▧",
        "food",
        "♨",
        "workshop",
        "⚒",
        "career",
        "▣",
        "student",
        "◈",
        "nightlife",
        "☾",
        "free",
        "$",
        "•",
      ],
      "text-size": 17,
      "text-font": ["Noto Sans Bold"],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": [
        "case",
        ["==", ["get", "selected"], 1],
        "#ef4444",
        "#334155",
      ],
    },
  });
}

export default function EventMap({
  events,
  selectedEvent,
  onSelectEvent,
  onSelectLocationGroup,
  userLocation,
  destinationLocation,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);

  const eventsRef = useRef(events);
  const onSelectEventRef = useRef(onSelectEvent);
  const onSelectLocationGroupRef = useRef(onSelectLocationGroup);

  const eventGeoJson = useMemo(() => {
    return createEventGeoJson(events, selectedEvent);
  }, [events, selectedEvent]);

  const eventGeoJsonRef = useRef(eventGeoJson);

  useEffect(() => {
    eventsRef.current = events;
    onSelectEventRef.current = onSelectEvent;
    onSelectLocationGroupRef.current = onSelectLocationGroup;
    eventGeoJsonRef.current = eventGeoJson;

    const map = mapRef.current;
    const source = map?.getSource(EVENT_SOURCE_ID);

    if (source?.setData) {
      source.setData(eventGeoJson);
    }
  }, [events, onSelectEvent, onSelectLocationGroup, eventGeoJson]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: GREATER_VANCOUVER_CENTER,
      zoom: 11,
      minZoom: 9,
      maxZoom: 18,
      attributionControl: false,
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
          onSelectLocationGroupRef.current(group);
        }

        const expansionZoom = await getClusterExpansionZoomAsync(source, clusterId);

        map.easeTo({
          center: coordinates,
          zoom: Math.min(expansionZoom + 0.4, 16),
          duration: 550,
        });
      } catch (error) {
        console.error("Could not expand event cluster:", error);
      }
    };

    const handlePointClick = (event) => {
      const feature = event.features?.[0];

      if (!feature) return;

      const group = buildLocationGroupFromFeature(feature, eventsRef.current);

      if (!group) return;

      if (group.events.length > 1 && onSelectLocationGroupRef.current) {
        onSelectLocationGroupRef.current(group);
        return;
      }

      onSelectEventRef.current?.(group.primaryEvent);
    };

    const bindEventLayerHandlers = () => {
      addEventLayers(map);

      const source = map.getSource(EVENT_SOURCE_ID);

      if (source?.setData) {
        source.setData(eventGeoJsonRef.current);
      }

      map.on("click", EVENT_CLUSTER_LAYER_ID, handleClusterClick);
      map.on("click", EVENT_CLUSTER_COUNT_LAYER_ID, handleClusterClick);

      map.on("click", EVENT_LOCATION_GROUP_LAYER_ID, handlePointClick);
      map.on("click", EVENT_LOCATION_GROUP_COUNT_LAYER_ID, handlePointClick);
      map.on("click", EVENT_SINGLE_BG_LAYER_ID, handlePointClick);
      map.on("click", EVENT_SINGLE_ICON_LAYER_ID, handlePointClick);

      [
        EVENT_CLUSTER_LAYER_ID,
        EVENT_CLUSTER_COUNT_LAYER_ID,
        EVENT_LOCATION_GROUP_LAYER_ID,
        EVENT_LOCATION_GROUP_COUNT_LAYER_ID,
        EVENT_SINGLE_BG_LAYER_ID,
        EVENT_SINGLE_ICON_LAYER_ID,
      ].forEach((layerId) => {
        map.on("mouseenter", layerId, setPointerCursor);
        map.on("mouseleave", layerId, clearPointerCursor);
      });
    };

    map.on("load", bindEventLayerHandlers);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedEvent?.lat || !selectedEvent?.lng) return;

    map.flyTo({
      center: [selectedEvent.lng, selectedEvent.lat],
      zoom: 15,
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

    const popup = new maplibregl.Popup({
      offset: 18,
      closeButton: false,
    }).setText("You are here");

    userMarkerRef.current = new maplibregl.Marker({
      element: createUserLocationElement(),
      anchor: "center",
    })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(popup)
      .addTo(map);

    map.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 14,
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
      .setLngLat([destinationLocation.lng, destinationLocation.lat])
      .setPopup(popup)
      .addTo(map);

    map.flyTo({
      center: [destinationLocation.lng, destinationLocation.lat],
      zoom: 15,
      speed: 1.6,
      curve: 1.15,
      essential: true,
    });
  }, [destinationLocation]);

  return (
    <section
      className="absolute inset-0 z-0 overflow-hidden"
      aria-label="Greater Vancouver event map"
    >
      <div ref={mapContainerRef} className="h-full w-full" />

      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-rose-50/35 via-transparent to-white/10" />
    </section>
  );
}
