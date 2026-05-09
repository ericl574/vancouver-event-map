import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { getCategoryById } from "../data/categories";

const GREATER_VANCOUVER_CENTER = [49.2463, -123.1162];

function createCategoryIcon(category, isSelected = false) {
  const size = isSelected ? 22 : 14;

  const background = isSelected
    ? "rgba(239, 68, 68, 0.95)"
    : "rgba(37, 99, 235, 0.55)";

  const shadow = isSelected
    ? "0 0 0 7px rgba(239, 68, 68, 0.18), 0 8px 18px rgba(15, 23, 42, 0.28)"
    : "0 0 0 5px rgba(37, 99, 235, 0.16), 0 6px 14px rgba(15, 23, 42, 0.18)";

  return L.divIcon({
    className: "",
    html: `
      <div
        style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 9999px;
          background: ${background};
          border: 2px solid white;
          box-shadow: ${shadow};
        "
      ></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function createUserLocationIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div
        style="
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: #2563eb;
          border: 4px solid white;
          box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.2);
        "
      ></div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });
}

function FlyToSelectedEvent({ selectedEvent }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedEvent?.lat || !selectedEvent?.lng) return;

    map.flyTo([selectedEvent.lat, selectedEvent.lng], 15, {
      duration: 0.6,
    });
  }, [selectedEvent, map]);

  return null;
}

function FlyToUserLocation({ userLocation }) {
  const map = useMap();

  useEffect(() => {
    if (!userLocation?.lat || !userLocation?.lng) return;

    map.flyTo([userLocation.lat, userLocation.lng], 14, {
      duration: 0.7,
    });
  }, [userLocation, map]);

  return null;
}

export default function EventMap({
  events,
  selectedEvent,
  onSelectEvent,
  userLocation,
}) {
  return (
    <section
  className="absolute inset-0 z-0 overflow-hidden"
  aria-label="Greater Vancouver event map"
>
  <MapContainer
    center={GREATER_VANCOUVER_CENTER}
    zoom={11}
    minZoom={9}
    maxZoom={18}
    scrollWheelZoom
    zoomControl={false}
    className="h-full w-full"
  >
<div className="pointer-events-none absolute inset-0 z-[400] 
bg-gradient-to-b from-rose-50/35 via-transparent to-white/10" />
        <TileLayer
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
/>

        <FlyToSelectedEvent selectedEvent={selectedEvent} />
        <FlyToUserLocation userLocation={userLocation} />

        {events.map((event) => {
          const category = getCategoryById(event.category);

          return (
            <Marker
              key={event.id}
              position={[event.lat, event.lng]}
              icon={createCategoryIcon(
                category,
                selectedEvent?.id === event.id
              )}
              zIndexOffset={selectedEvent?.id === event.id ? 1000 : 0}
              eventHandlers={{
                click: () => onSelectEvent(event),
              }}
            >
              <Popup>
                <div className="min-w-48">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    {category.label}
                  </p>

                  <h3 className="font-bold text-slate-900">{event.title}</h3>

                  <p className="text-sm text-slate-600">
                    {event.venue} · {event.area}
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {event.date} · {event.startTime}
                  </p>

                  <p className="text-sm">{event.price}</p>

                  {event.distanceKm !== undefined && (
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {event.distanceKm.toFixed(1)} km away
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={createUserLocationIcon()}
            zIndexOffset={2000}
          >
            <Popup>You are here</Popup>
          </Marker>
        )}
      </MapContainer>
    </section>
  );
}