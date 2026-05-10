import CategoryIcon from "./CategoryIcon";
import { getCategoryById } from "../data/categories";

export default function EventCard({ event, isSelected, onClick }) {
  const category = getCategoryById(event.category);

  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      className={`w-full rounded-2xl border px-3.5 py-3 text-left transition ${
        isSelected
          ? "border-rose-300 bg-white shadow-md"
          : "border-slate-200 bg-white/90 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
            isSelected
              ? "bg-rose-50 text-rose-600"
              : "bg-slate-50 text-slate-500"
          }`}
        >
          <CategoryIcon icon={category.icon} className="h-4.5 w-4.5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {category.label}
          </div>

          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-950">
            {event.title}
          </h3>

          <p className="mt-1 truncate text-sm text-slate-500">
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
