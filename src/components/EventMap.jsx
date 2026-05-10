import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getCategoryById } from "../data/categories";

const GREATER_VANCOUVER_CENTER = [-123.1162, 49.2463];

function createEventMarkerElement(category, isSelected = false) {
  const marker = document.createElement("div");

  const size = isSelected ? 22 : 14;
  const color = isSelected ? "#ef4444" : category.hex || "#2563eb";

  marker.style.width = `${size}px`;
  marker.style.height = `${size}px`;
  marker.style.borderRadius = "9999px";
  marker.style.background = color;
  marker.style.border = "2px solid white";
  marker.style.boxShadow = isSelected
    ? "0 0 0 7px rgba(239, 68, 68, 0.18), 0 8px 18px rgba(15, 23, 42, 0.28)"
    : "0 0 0 5px rgba(37, 99, 235, 0.16), 0 6px 14px rgba(15, 23, 42, 0.18)";
  marker.style.cursor = "pointer";

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

function createPopupHtml(event, category) {
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

export default function EventMap({
  events,
  selectedEvent,
  onSelectEvent,
  userLocation,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const eventMarkersRef = useRef([]);
  const userMarkerRef = useRef(null);

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

    events.forEach((event) => {
      if (!event.lat || !event.lng) return;

      const category = getCategoryById(event.category);
      const isSelected = selectedEvent?.id === event.id;
      const markerElement = createEventMarkerElement(category, isSelected);

      markerElement.addEventListener("click", () => {
        onSelectEvent(event);
      });

      const popup = new maplibregl.Popup({
        offset: 18,
        closeButton: false,
      }).setHTML(createPopupHtml(event, category));

      const marker = new maplibregl.Marker({
        element: markerElement,
        anchor: "center",
      })
        .setLngLat([event.lng, event.lat])
        .setPopup(popup)
        .addTo(map);

      eventMarkersRef.current.push(marker);
    });
  }, [events, selectedEvent, onSelectEvent]);

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