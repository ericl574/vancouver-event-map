import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getCategoryById } from "../data/categories";

const GREATER_VANCOUVER_CENTER = [-123.1162, 49.2463];

function getLocationGroupKey(event) {
  const lat = Number(event.lat);
  const lng = Number(event.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "";
  }

  // 5 decimals is about 1 meter precision, enough to group same-location events.
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function getEventSortValue(event) {
  const date = event.event_date || event.eventDate || "";
  const time = event.start_time || event.rawStartTime || "23:59:59";

  const timestamp = new Date(`${date}T${time}`).getTime();

  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function groupEventsByLocation(events) {
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

    return {
      ...group,
      events: sortedEvents,
      primaryEvent: sortedEvents[0],
    };
  });
}

function getGroupCategory(group) {
  const firstCategory = group.primaryEvent?.category;
  const allSameCategory = group.events.every(
    (event) => event.category === firstCategory
  );

  if (allSameCategory) {
    return getCategoryById(firstCategory);
  }

  return {
    id: "mixed",
    label: "Multiple events",
    hex: "#e11d48",
  };
}

function getCategoryMarkerSvg(categoryId) {
  const iconStyle =
    'width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"';

  const icons = {
    music: `<svg ${iconStyle}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    festival: `<svg ${iconStyle}><path d="M4 20h16"/><path d="M6 20l6-16 6 16"/><path d="M8.5 13h7"/><path d="M10 9h4"/></svg>`,
    comedy: `<svg ${iconStyle}><circle cx="12" cy="12" r="9"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 15c1.2 1 2.5 1.5 4 1.5s2.8-.5 4-1.5"/></svg>`,
    art: `<svg ${iconStyle}><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="10" r="1.5"/><path d="M21 15l-5-5L5 19"/></svg>`,
    food: `<svg ${iconStyle}><path d="M4 3v8"/><path d="M8 3v8"/><path d="M4 7h4"/><path d="M6 11v10"/><path d="M17 3v18"/><path d="M14 3h3a3 3 0 0 1 3 3v5h-3"/></svg>`,
    workshop: `<svg ${iconStyle}><path d="M14.7 6.3a4 4 0 0 0-5 5L4 17v3h3l5.7-5.7a4 4 0 0 0 5-5l-3 3-3-3 3-3Z"/></svg>`,
    career: `<svg ${iconStyle}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/></svg>`,
    student: `<svg ${iconStyle}><path d="M22 10L12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c2 1.3 4 2 6 2s4-.7 6-2v-5"/></svg>`,
    nightlife: `<svg ${iconStyle}><path d="M12 3a7 7 0 1 0 8.5 8.5A5.5 5.5 0 0 1 12 3Z"/></svg>`,
    free: `<svg ${iconStyle}><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>`,
    event: `<svg ${iconStyle}><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 10h16"/></svg>`,
  };

  return icons[categoryId] || icons.event;
}

function createEventMarkerElement(group, isSelected = false) {
  const marker = document.createElement("div");
  const category = getGroupCategory(group);
  const count = group.events.length;
  const isGrouped = count > 1;

  marker.style.borderRadius = "9999px";
  marker.style.border = "2px solid white";
  marker.style.cursor = "pointer";
  marker.style.display = "flex";
  marker.style.alignItems = "center";
  marker.style.justifyContent = "center";
  marker.style.userSelect = "none";

  if (isGrouped) {
    const size = isSelected ? 38 : 34;

    marker.style.width = `${size}px`;
    marker.style.height = `${size}px`;
    marker.style.background = "#2563eb";
    marker.style.color = "white";
    marker.style.fontSize = "13px";
    marker.style.fontWeight = "900";
    marker.style.lineHeight = "1";
    marker.textContent = String(count);

    marker.style.boxShadow = isSelected
      ? "0 0 0 4px rgba(37, 99, 235, 0.38), 0 0 0 9px rgba(37, 99, 235, 0.16), 0 10px 24px rgba(15, 23, 42, 0.3)"
      : "0 0 0 4px rgba(37, 99, 235, 0.16), 0 8px 18px rgba(15, 23, 42, 0.24)";

    return marker;
  }

  const size = isSelected ? 32 : 28;

  marker.style.width = `${size}px`;
  marker.style.height = `${size}px`;
  marker.style.background = "rgba(255, 255, 255, 0.97)";
  marker.style.color = isSelected ? "#2563eb" : "#334155";

  marker.style.boxShadow = isSelected
    ? "0 0 0 4px rgba(37, 99, 235, 0.36), 0 0 0 9px rgba(37, 99, 235, 0.14), 0 10px 24px rgba(15, 23, 42, 0.28)"
    : "0 0 0 3px rgba(15, 23, 42, 0.06), 0 6px 14px rgba(15, 23, 42, 0.16)";

  marker.innerHTML = getCategoryMarkerSvg(category.icon || category.id);

  return marker;
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
        transform: translateX(-50%);
        border-radius: 9999px 9999px 9999px 0;
        background: #ef4444;
        border: 3px solid white;
        rotate: -45deg;
        box-shadow: 0 0 0 7px rgba(239, 68, 68, 0.18);
      "
    >
      <div
        style="
          position: absolute;
          left: 50%;
          top: 50%;
          width: 12px;
          height: 12px;
          transform: translate(-50%, -50%);
          border-radius: 9999px;
          background: white;
        "
      ></div>
    </div>
  `;

  return wrapper;
}

function createSingleEventPopupHtml(event, category) {
  return `
    <div style="min-width: 190px;">
      <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b;">
        ${category.label}
      </p>

      <h3 style="margin: 0 0 6px; font-size: 15px; font-weight: 800; color: #0f172a;">
        ${event.title}
      </h3>

      <p style="margin: 0 0 4px; font-size: 13px; color: #475569;">
        ${event.venue || ""}${event.area ? ` · ${event.area}` : ""}
      </p>

      <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #0f172a;">
        ${event.date || ""}${event.startTime ? ` · ${event.startTime}` : ""}
      </p>

      <p style="margin: 0; font-size: 13px; color: #334155;">
        ${event.price || ""}
      </p>

      ${
        event.distanceKm !== undefined
          ? `<p style="margin: 4px 0 0; font-size: 12px; font-weight: 600; color: #64748b;">
              ${event.distanceKm.toFixed(1)} km away
            </p>`
          : ""
      }
    </div>
  `;
}

function createGroupedPopupHtml(group) {
  const venue = group.primaryEvent?.venue || "This location";
  const visibleEvents = group.events.slice(0, 5);

  const eventRows = visibleEvents
    .map(
      (event) => `
        <div style="padding: 8px 0; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 2px; font-size: 13px; font-weight: 800; color: #0f172a;">
            ${event.title}
          </p>
          <p style="margin: 0; font-size: 12px; color: #475569;">
            ${event.date || ""}${event.startTime ? ` · ${event.startTime}` : ""}${event.price ? ` · ${event.price}` : ""}
          </p>
        </div>
      `
    )
    .join("");

  const remainingCount = group.events.length - visibleEvents.length;

  return `
    <div style="min-width: 230px;">
      <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b;">
        ${group.events.length} events at this location
      </p>

      <h3 style="margin: 0 0 8px; font-size: 15px; font-weight: 800; color: #0f172a;">
        ${venue}
      </h3>

      ${eventRows}

      ${
        remainingCount > 0
          ? `<p style="margin: 8px 0 0; font-size: 12px; font-weight: 700; color: #64748b;">
              +${remainingCount} more event${remainingCount === 1 ? "" : "s"}
            </p>`
          : ""
      }
    </div>
  `;
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
const eventMarkersRef = useRef([]);
const userMarkerRef = useRef(null);
const destinationMarkerRef = useRef(null);

  const locationGroups = useMemo(() => {
    return groupEventsByLocation(events);
  }, [events]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: GREATER_VANCOUVER_CENTER,
      zoom: 11,
      minZoom: 9,
      maxZoom: 18,
      attributionControl: false,
    });

    mapRef.current.scrollZoom.setZoomRate(1 / 25);
    mapRef.current.scrollZoom.setWheelZoomRate(1 / 150);

    mapRef.current.addControl(
      new maplibregl.AttributionControl({
        compact: true,
      }),
      "bottom-right"
    );

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    eventMarkersRef.current.forEach((marker) => marker.remove());
    eventMarkersRef.current = [];

    locationGroups.forEach((group) => {
      if (!group.lat || !group.lng) return;

      const containsSelectedEvent = group.events.some(
        (event) => event.id === selectedEvent?.id
      );

      const markerElement = createEventMarkerElement(
        group,
        containsSelectedEvent
      );

      markerElement.addEventListener("click", () => {
        if (group.events.length > 1 && onSelectLocationGroup) {
          onSelectLocationGroup(group);
          return;
        }

        onSelectEvent(group.primaryEvent);
      });

      const category = getCategoryById(group.primaryEvent?.category);

      const popup = new maplibregl.Popup({
        offset: 18,
        closeButton: false,
      }).setHTML(
        group.events.length > 1
          ? createGroupedPopupHtml(group)
          : createSingleEventPopupHtml(group.primaryEvent, category)
      );

      const marker = new maplibregl.Marker({
        element: markerElement,
        anchor: "center",
      })
        .setLngLat([group.lng, group.lat])
        .setPopup(popup)
        .addTo(map);

      eventMarkersRef.current.push(marker);
    });
  }, [locationGroups, selectedEvent, onSelectEvent]);

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