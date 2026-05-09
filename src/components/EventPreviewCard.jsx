import { getCategoryById } from "../data/categories";
import { IconBookmark, IconCalendarPlus, IconShare } from "./Icons";

export default function EventPreviewCard({ event }) {
  if (!event) return null;

  const category = getCategoryById(event.category);

  return (
    <section className="absolute inset-x-0 bottom-0 z-40 rounded-t-3xl bg-white p-4 shadow-2xl lg:left-auto lg:right-6 lg:w-96 lg:rounded-3xl">
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 lg:hidden" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${category.colorClass}`} />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {category.label}
            </span>
          </div>

          <h2 className="text-xl font-bold">{event.title}</h2>

          <p className="text-sm text-slate-500">
            {event.venue} · {event.area}
          </p>
        </div>

        <button
          type="button"
          className="rounded-full border border-slate-200 p-2 hover:bg-slate-50"
          aria-label="Save event"
        >
          <IconBookmark className="h-5 w-5" />
        </button>
      </div>

      <p className="mt-3 text-sm text-slate-600">{event.description}</p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-2xl bg-slate-100 p-3">
          <p className="text-xs text-slate-500">Date</p>
          <p className="font-semibold">{event.date}</p>
        </div>

        <div className="rounded-2xl bg-slate-100 p-3">
          <p className="text-xs text-slate-500">Time</p>
          <p className="font-semibold">{event.startTime}</p>
        </div>

        <div className="rounded-2xl bg-slate-100 p-3">
          <p className="text-xs text-slate-500">Price</p>
          <p className="font-semibold">{event.price}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          View Details
        </button>

        <button
          type="button"
          className="rounded-2xl border border-slate-200 p-3 hover:bg-slate-50"
          aria-label="Add to calendar"
        >
          <IconCalendarPlus className="h-5 w-5" />
        </button>

        <button
          type="button"
          className="rounded-2xl border border-slate-200 p-3 hover:bg-slate-50"
          aria-label="Share event"
        >
          <IconShare className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}