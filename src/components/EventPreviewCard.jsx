import { useState } from "react";
import CategoryIcon from "./CategoryIcon";
import { getCategoryById } from "../data/categories";
import {
  IconBookmark,
  IconCalendarPlus,
  IconShare,
} from "./Icons";

export default function EventPreviewCard({ event }) {
  const [shareMessage, setShareMessage] = useState("");

  if (!event) return null;

  const category = getCategoryById(event.category);

  async function handleShareEvent() {
    const eventUrl = `${window.location.origin}/?event=${event.id}`;

    const shareText = `${event.title}
${event.venue} · ${event.area}
${event.date} · ${event.startTime}
${event.price}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: eventUrl,
        });

        setShareMessage("Shared!");
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${eventUrl}`);
        setShareMessage("Copied link!");
      }

      setTimeout(() => {
        setShareMessage("");
      }, 1800);
    } catch (error) {
      if (error.name === "AbortError") return;

      console.error("Share failed:", error);
      setShareMessage("Could not share this event.");

      setTimeout(() => {
        setShareMessage("");
      }, 1800);
    }
  }

  function handleAddToCalendar() {
    const start = buildCalendarDate(event.date, event.startTime);
    const end = buildCalendarDate(event.date, event.endTime);

    const finalEnd =
      end && end > start
        ? end
        : new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const calendarUrl = new URL("https://calendar.google.com/calendar/render");

    calendarUrl.searchParams.set("action", "TEMPLATE");
    calendarUrl.searchParams.set("text", event.title);
    calendarUrl.searchParams.set(
      "dates",
      `${formatGoogleCalendarDate(start)}/${formatGoogleCalendarDate(finalEnd)}`
    );
    calendarUrl.searchParams.set(
      "details",
      event.description || "Event from Vancouver Event Map"
    );
    calendarUrl.searchParams.set("location", `${event.venue}, ${event.area}`);

    window.open(calendarUrl.toString(), "_blank", "noopener,noreferrer");
  }

  function buildCalendarDate(dateText, timeText) {
    if (!dateText || !timeText) {
      const fallback = new Date();
      fallback.setHours(19, 0, 0, 0);
      return fallback;
    }

    const parsed = new Date(`${dateText}T${timeText}`);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }

    const fallbackParsed = new Date(`${dateText} ${timeText}`);

    if (!Number.isNaN(fallbackParsed.getTime())) {
      return fallbackParsed;
    }

    const fallback = new Date();
    fallback.setHours(19, 0, 0, 0);
    return fallback;
  }

  function formatGoogleCalendarDate(date) {
    return date.toISOString().replace(/[-:]|\.\d{3}/g, "");
  }

  return (
    <section className="absolute inset-x-0 bottom-0 z-40 rounded-t-3xl bg-white p-4 shadow-2xl lg:left-auto lg:right-6 lg:w-96 lg:rounded-3xl">
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 lg:hidden" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
              <CategoryIcon icon={category.icon} className="h-4 w-4" />
            </span>

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
          className="rounded-full border border-slate-200 p-2 transition hover:bg-slate-50"
          aria-label="Save event"
        >
          <IconBookmark className="h-5 w-5" />
        </button>
      </div>

      <p className="mt-3 line-clamp-3 text-sm text-slate-600">
        {event.description}
      </p>

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

      {shareMessage && (
        <p className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-center text-xs font-semibold text-rose-700">
          {shareMessage}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          View Details
        </button>

        <button
          type="button"
          onClick={handleAddToCalendar}
          className="rounded-2xl border border-slate-200 p-3 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          aria-label="Add to calendar"
        >
          <IconCalendarPlus className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={handleShareEvent}
          className="rounded-2xl border border-slate-200 p-3 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          aria-label="Share event"
        >
          <IconShare className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}