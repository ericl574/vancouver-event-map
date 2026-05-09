import { getCategoryById } from "../data/categories";

export default function EventCard({ event, isSelected, onClick }) {
  const category = getCategoryById(event.category);

  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      className={`w-full rounded-2xl border p-3 text-left transition ${
        isSelected
          ? "border-blue-900 bg-white shadow-md"
          : "border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg transition ${
            isSelected
              ? "bg-red-50 text-red-600"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          {category.icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {category.label}
            </span>
          </div>

          <h3 className="font-semibold text-slate-900">{event.title}</h3>

          <p className="text-sm text-slate-500">
            {event.venue} · {event.area}
          </p>

          <p className="mt-1 text-sm font-medium text-slate-700">
            {event.date} · {event.startTime} · {event.price}
          </p>

          {event.distanceKm !== undefined && (
            <p className="mt-1 text-xs font-medium text-slate-500">
              {event.distanceKm.toFixed(1)} km away
            </p>
          )}
        </div>
      </div>
    </button>
  );
}