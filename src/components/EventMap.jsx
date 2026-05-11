import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CATEGORY_ICON_SVGS } from "../assets/categoryIcons";
import { getCategoryById } from "../data/categories";

const GREATER_VANCOUVER_CENTER = [-123.1162, 49.2463];

const EVENT_SOURCE_ID = "event-points";

const EVENT_CLUSTER_LAYER_ID = "event-clusters";
const EVENT_CLUSTER_COUNT_LAYER_ID = "event-cluster-count";

const EVENT_LOCATION_GROUP_LAYER_ID = "event-location-groups";
const EVENT_LOCATION_GROUP_COUNT_LAYER_ID = "event-location-group-count";

const EVENT_SINGLE_DOT_LAYER_ID = "event-single-dots";
const EVENT_SINGLE_ICON_LAYER_ID = "event-single-icons";

const MAP_CATEGORY_ICON_SIZE = 24;

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

      const normalSvg = colorizeSvg(svg, "#0f172a");
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

    const image = await svgToImageData(colorizeSvg(fallbackSvg, "#0f172a"));
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
    id: EVENT_SINGLE_DOT_LAYER_ID,
    type: "circle",
    source: EVENT_SOURCE_ID,
    filter: [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "eventCount"], 1],
    ],
    paint: {
      "circle-color": [
        "case",
        ["==", ["get", "selected"], 1],
        "#ef4444",
        "#dbeafe",
      ],
      "circle-radius": [
        "case",
        ["==", ["get", "selected"], 1],
        18,
        16,
      ],
      "circle-stroke-color": "rgba(255, 255, 255, 0.98)",
      "circle-stroke-width": [
        "case",
        ["==", ["get", "selected"], 1],
        3,
        2.5,
      ],
      "circle-opacity": 0.98,
    },
  });

  map.addLayer({
    id: EVENT_SINGLE_ICON_LAYER_ID,
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
        ["get", "selectedIconImage"],
        ["get", "iconImage"],
      ],
      "icon-size": [
        "case",
        ["==", ["get", "selected"], 1],
        1.28,
        1.24,
      ],
      "icon-anchor": "center",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });

  map.addLayer({
    id: EVENT_LOCATION_GROUP_LAYER_ID,
    type: "circle",
    source: EVENT_SOURCE_ID,
    filter: [
      "all",
      ["!", ["has", "point_count"]],
      [">", ["get", "eventCount"], 1],
    ],
    paint: {
      "circle-color": [
        "case",
        ["==", ["get", "selected"], 1],
        "#ef4444",
        "#3b82f6",
      ],
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "eventCount"],
        2,
        15,
        5,
        19,
        10,
        24,
        20,
        29,
      ],
      "circle-stroke-color": "rgba(255, 255, 255, 0.98)",
      "circle-stroke-width": 2.75,
      "circle-opacity": 0.98,
    },
  });

  map.addLayer({
    id: EVENT_LOCATION_GROUP_COUNT_LAYER_ID,
    type: "symbol",
    source: EVENT_SOURCE_ID,
    filter: [
      "all",
      ["!", ["has", "point_count"]],
      [">", ["get", "eventCount"], 1],
    ],
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
        15,
      ],
      "text-font": ["Noto Sans Bold"],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "rgba(15, 23, 42, 0.18)",
      "text-halo-width": 0.4,
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
        "#3b82f6",
      ],
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
      "circle-stroke-color": "rgba(255, 255, 255, 0.98)",
      "circle-stroke-width": 2.75,
      "circle-opacity": 0.98,
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
        15,
      ],
      "text-font": ["Noto Sans Bold"],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "rgba(15, 23, 42, 0.18)",
      "text-halo-width": 0.4,
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
  const [isMapReady, setIsMapReady] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const suppressNextSelectedFlyRef = useRef(false);

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

    const bindEventLayerHandlers = async () => {
      try {
        await addCategoryIconImages(map);
      } catch (error) {
        console.error("Could not load category icons:", error);
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
      map.on("click", EVENT_SINGLE_ICON_LAYER_ID, handleSingleClick);

      [
        EVENT_CLUSTER_LAYER_ID,
        EVENT_CLUSTER_COUNT_LAYER_ID,
        EVENT_LOCATION_GROUP_LAYER_ID,
        EVENT_LOCATION_GROUP_COUNT_LAYER_ID,
        EVENT_SINGLE_DOT_LAYER_ID,
        EVENT_SINGLE_ICON_LAYER_ID,
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

      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-rose-50/25 via-transparent to-white/10" />
    </section>
  );
}