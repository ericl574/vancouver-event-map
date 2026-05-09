import { getCategoryById } from "../data/categories";

export default function EventCard({ event, isSelected, onClick }) {
  const category = getCategoryById(event.category);

  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      aria-pressed={isSelected}
      className={`w-full rounded-2xl border p-3 text-left transition hover:bg-slate-50 ${
        isSelected ? "border-slate-900 bg-slate-50" : "border-slate-200"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${category.colorClass}`} />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {category.label}
        </span>
      </div>

      <h3 className="font-semibold text-slate-900">{event.title}</h3>

      <p className="text-sm text-slate-500">
        {event.venue} · {event.area}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-800">
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