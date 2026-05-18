import { useEffect, useState } from "react";
import CategoryIcon from "./CategoryIcon";
import { getCategoryById } from "../data/categories";
import { inferEventSubcategories } from "../utils/categoryTaxonomyUtils";
import {
  IconBookmark,
  IconCalendarPlus,
  IconShare,
} from "./Icons";

function getSavedEventsStorageKey(authSession) {
  const userId = authSession?.user?.id || "guest";
  return `vancouver-event-map:saved-events:${userId}`;
}

function readSavedEventIds(authSession) {
  try {
    const rawValue = window.localStorage.getItem(
      getSavedEventsStorageKey(authSession)
    );

    const parsedValue = JSON.parse(rawValue || "[]");

    return Array.isArray(parsedValue) ? parsedValue.map(String) : [];
  } catch (error) {
    console.error("Could not read saved events:", error);
    return [];
  }
}

function writeSavedEventIds(authSession, eventIds) {
  window.localStorage.setItem(
    getSavedEventsStorageKey(authSession),
    JSON.stringify([...new Set(eventIds.map(String))])
  );
}

function getEventUrl(event) {
  return event.ticketUrl || event.sourceUrl || "";
}

export default function EventPreviewCard({
  event,
  authSession,
  variant = "map",
  onClose,
}) {
  const [shareMessage, setShareMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isCalendarMenuOpen, setIsCalendarMenuOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(variant === "detail");

  const isDetailVariant = variant === "detail";

  useEffect(() => {
    setIsDetailsOpen(isDetailVariant);
  }, [event?.id, isDetailVariant]);

  useEffect(() => {
    if (!event?.id) {
      setIsSaved(false);
      return;
    }

    const savedEventIds = readSavedEventIds(authSession);
    setIsSaved(savedEventIds.includes(String(event.id)));
  }, [event?.id, authSession?.user?.id]);

  if (!event) return null;

  const category = getCategoryById(event.category);
  const eventSubcategories = inferEventSubcategories(event);
  const eventUrl = getEventUrl(event);

  const sectionClassName = isDetailVariant
    ? "relative h-full w-full overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-900/10"
    : "absolute inset-x-0 bottom-0 z-40 max-h-[56dvh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-2xl lg:left-auto lg:max-h-[72vh] lg:pb-4 lg:right-6 lg:w-96 lg:rounded-3xl";

  const descriptionClassName = isDetailVariant
    ? "mt-4 text-sm leading-6 text-slate-600"
    : "mt-3 line-clamp-2 text-sm text-slate-600 sm:line-clamp-3";

  async function handleShareEvent() {
    const shareUrl = `${window.location.origin}/?event=${event.id}`;

    const shareText = `${event.title}
${event.venue} · ${event.area}
${event.date} · ${event.startTime}
${event.price}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: shareUrl,
        });

        setShareMessage("Shared!");
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
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

  function handleToggleSaveEvent() {
    if (!authSession?.user) {
      setSaveMessage("Please log in to save events.");

      setTimeout(() => {
        window.location.href = "/login";
      }, 700);

      return;
    }

    const eventId = String(event.id);
    const savedEventIds = readSavedEventIds(authSession);

    if (savedEventIds.includes(eventId)) {
      writeSavedEventIds(
        authSession,
        savedEventIds.filter((savedEventId) => savedEventId !== eventId)
      );

      window.dispatchEvent(new Event("saved-events-updated"));

      setIsSaved(false);
      setSaveMessage("Removed from saved events.");
    } else {
      writeSavedEventIds(authSession, [...savedEventIds, eventId]);

      window.dispatchEvent(new Event("saved-events-updated"));

      setIsSaved(true);
      setSaveMessage("Saved!");
    }

    setTimeout(() => {
      setSaveMessage("");
    }, 1800);
  }

  function handleAddToGoogleCalendar() {
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

    setIsCalendarMenuOpen(false);
    window.open(calendarUrl.toString(), "_blank", "noopener,noreferrer");
  }

  function handleDownloadCalendarFile() {
    const start = buildCalendarDate(event.date, event.startTime);
    const end = buildCalendarDate(event.date, event.endTime);

    const finalEnd =
      end && end > start
        ? end
        : new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Vancouver Event Map//Event Calendar//EN",
      "BEGIN:VEVENT",
      `UID:${event.id}@vancouver-event-map`,
      `DTSTAMP:${formatGoogleCalendarDate(new Date())}`,
      `DTSTART:${formatGoogleCalendarDate(start)}`,
      `DTEND:${formatGoogleCalendarDate(finalEnd)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DESCRIPTION:${escapeIcsText(event.description || "Event from Vancouver Event Map")}`,
      `LOCATION:${escapeIcsText(`${event.venue}, ${event.area}`)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = `${slugifyFileName(event.title || "event")}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(downloadUrl);
    setIsCalendarMenuOpen(false);
  }

  function escapeIcsText(value) {
    return String(value ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function slugifyFileName(value) {
    return (
      String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "event"
    );
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
    <section className={sectionClassName}>
      {!isDetailVariant && (
        <div className="mb-3 flex items-center lg:hidden">
          <div className="flex-1" />
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
          <div className="flex flex-1 justify-end">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500 transition hover:bg-slate-200"
                aria-label="Close event preview"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
              <CategoryIcon icon={category.icon} className="h-4 w-4" />
            </span>

            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {category.label}
            </span>
          </div>

          <h2
            className={`font-bold text-slate-950 ${
              isDetailVariant ? "text-3xl leading-tight" : "text-xl"
            }`}
          >
            {event.title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {event.venue} · {event.area}
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleSaveEvent}
          className={`rounded-full border p-2 transition ${
            isSaved
              ? "border-pink-200 bg-pink-50 text-pink-600 hover:bg-pink-100"
              : "border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
          aria-label={isSaved ? "Remove saved event" : "Save event"}
          title={isSaved ? "Remove saved event" : "Save event"}
        >
          <IconBookmark
            className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`}
          />
        </button>
      </div>

      <p className={descriptionClassName}>
        {event.description || "No description provided."}
      </p>

      {eventSubcategories.length > 0 && (isDetailVariant || isDetailsOpen) && (
        <div className="mt-4 rounded-2xl border border-pink-100 bg-pink-50 p-3 text-slate-800">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-500">
            Event analysis
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {eventSubcategories.map((subcategory) => (
              <span
                key={subcategory.id}
                className="rounded-full bg-white px-3 py-1 text-xs font-bold text-pink-600 ring-1 ring-pink-100"
              >
                {subcategory.label}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Inferred from the event title, description, venue, and tags.
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-2xl bg-slate-100 p-3">
          <p className="text-xs text-slate-500">Date</p>
          <p className="font-semibold">{event.date || "TBA"}</p>
        </div>

        <div className="rounded-2xl bg-slate-100 p-3">
          <p className="text-xs text-slate-500">Time</p>
          <p className="font-semibold">{event.startTime || "TBA"}</p>
        </div>

        <div className="rounded-2xl bg-slate-100 p-3">
          <p className="text-xs text-slate-500">Price</p>
          <p className="font-semibold">{event.price || "TBA"}</p>
        </div>
      </div>

      {isDetailsOpen && (
        <div
          className={`mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 ${
            isDetailVariant ? "p-4" : "p-3"
          }`}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">
              Event details
            </h3>

          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-100">
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Venue
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {event.venue || "Not provided"}
              </dd>
            </div>

            <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-100">
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Area
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {event.area || event.city || "Not provided"}
              </dd>
            </div>

            <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-100 sm:col-span-2">
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Address
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {event.address || "No address provided"}
              </dd>
            </div>

            <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-100">
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Start
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {event.event_date || event.date || "TBA"} ·{" "}
                {event.startTime || event.start_time || "TBA"}
              </dd>
            </div>

            <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-100">
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                End
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {event.endTime || event.end_time || "TBA"}
              </dd>
            </div>

            <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-100 sm:col-span-2">
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Organizer
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {event.organizerName || "Not provided"}
              </dd>
            </div>
          </dl>

          {event.tags?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Tags
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-100"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {(shareMessage || saveMessage) && (
        <p
          className={`mt-3 rounded-2xl px-3 py-2 text-center text-xs font-semibold ${
            saveMessage
              ? "bg-pink-50 text-pink-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {saveMessage || shareMessage}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setIsDetailsOpen((isOpen) => !isOpen)}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {isDetailsOpen ? "Hide Details" : "View Details"}
        </button>

        {eventUrl && (
          <a
            href={eventUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-pink-300 hover:bg-pink-50 hover:text-pink-600"
          >
            Tickets
          </a>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsCalendarMenuOpen((isOpen) => !isOpen)}
            className="rounded-2xl border border-slate-200 p-3 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            aria-label="Add to calendar"
            title="Add to calendar"
          >
            <IconCalendarPlus className="h-5 w-5" />
          </button>

          {isCalendarMenuOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm shadow-2xl shadow-slate-900/15">
              <button
                type="button"
                onClick={handleAddToGoogleCalendar}
                className="block w-full px-4 py-3 text-left font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
              >
                Google Calendar
              </button>

              <button
                type="button"
                onClick={handleDownloadCalendarFile}
                className="block w-full border-t border-slate-100 px-4 py-3 text-left font-semibold text-slate-700 transition hover:bg-pink-50 hover:text-pink-600"
              >
                Computer Calendar (.ics)
              </button>
            </div>
          )}
        </div>

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
