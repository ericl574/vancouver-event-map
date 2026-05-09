import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import { getCategoryById } from "../data/categories";

function createCategoryIcon(category, isSelected = false) {
  const size = isSelected ? 34 : 28;

  return L.divIcon({
    className: "",
    html: `
      <div
        style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 9999px;
          background: ${category.hex};
          border: 3px solid white;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        "
      >
        <div
          style="
            width: 8px;
            height: 8px;
            border-radius: 9999px;
            background: white;
          "
        ></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export default function EventMarker({ event, isSelected, onClick }) {
  const category = getCategoryById(event.category);

  return (
    <Marker
      position={[event.lat, event.lng]}
      icon={createCategoryIcon(category, isSelected)}
      zIndexOffset={isSelected ? 1000 : 0}
      eventHandlers={{
        click: () => onClick(event),
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
}