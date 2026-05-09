import { getCategoryById } from "../data/categories";

export default function EventCard({ event, isSelected, onClick }) {
  const category = getCategoryById(event.category);

  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      className={`w-full rounded-2xl border p-3 text-left transition ${
        isSelected
          ? "border-blue-900 bg-white"
          : "border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${category.colorClass}`} />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {category.label}
        </span>
      </div>

      <h3 className="font-semibold">{event.title}</h3>

      <p className="text-sm text-slate-500">
        {event.venue} · {event.area}
      </p>

      <p className="mt-1 text-sm font-medium">
        {event.date} · {event.startTime} · {event.price}
      </p>

      {event.distanceKm !== undefined && (
        <p className="mt-1 text-xs font-medium text-slate-500">
          {event.distanceKm.toFixed(1)} km away
        </p>
      )}
    </button>
  );
}