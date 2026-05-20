import { useEffect, useRef, useState } from "react";
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
  const [mobileSheetState, setMobileSheetState] = useState("compact");
  const [isMobileLayout, setIsMobileLayout] = useState(
    () => window.matchMedia("(max-width: 1023px)").matches
  );
  const mobileDragRef = useRef(null);
  const hasMobileDraggedRef = useRef(false);
  const [mobileDragY, setMobileDragY] = useState(0);
  const [isMobileDragging, setIsMobileDragging] = useState(false);

  const isDetailVariant = variant === "detail";

  useEffect(() => {
    setMobileSheetState("compact");
  }, [event?.id, isDetailVariant]);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const handler = (e) => setIsMobileLayout(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    function sync() {
      if (!event?.id) { setIsSaved(false); return; }
      setIsSaved(readSavedEventIds(authSession).includes(String(event.id)));
    }
    sync();
    window.addEventListener("saved-events-updated", sync);
    return () => window.removeEventListener("saved-events-updated", sync);
  }, [event?.id, authSession?.user?.id]);

  if (!event) return null;

  const category = getCategoryById(event.category);
  const eventSubcategories = inferEventSubcategories(event);
  const eventUrl = getEventUrl(event);

  // Mobile: flex-col so the header is always visible; desktop: plain scrolling block
  const sectionClassName = isDetailVariant
    ? "relative h-full w-full overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-900/10"
    : "absolute inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl will-change-transform lg:block lg:overflow-y-auto lg:max-h-[72vh] lg:left-auto lg:right-6 lg:w-96 lg:rounded-3xl";

  // Applied only on mobile to drive the compact/full height + live drag feedback
  const mobileSheetStyle =
    isMobileLayout && !isDetailVariant
      ? {
          maxHeight: mobileSheetState === "full" ? "88dvh" : "56dvh",
          transition: isMobileDragging
            ? "none"
            : "max-height 0.3s ease-out, transform 0.3s ease-out",
          transform:
            isMobileDragging && mobileDragY > 0
              ? `translateY(${mobileDragY}px)`
              : undefined,
        }
      : {};

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
    const rawDate = event.event_date || event.eventDate || event.date;
    const rawStart = event.start_time || event.rawStartTime || event.startTime;
    const rawEnd = event.end_time || event.rawEndTime || event.endTime;
    const start = buildCalendarDate(rawDate, rawStart);
    const end = buildCalendarDate(rawDate, rawEnd);

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
    const rawDate = event.event_date || event.eventDate || event.date;
    const rawStart = event.start_time || event.rawStartTime || event.startTime;
    const rawEnd = event.end_time || event.rawEndTime || event.endTime;
    const start = buildCalendarDate(rawDate, rawStart);
    const end = buildCalendarDate(rawDate, rawEnd);

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

  // --- Mobile drag handlers on the header strip ---

  function onMobileDragPointerDown(e) {
    if (e.button && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    mobileDragRef.current = { startY: e.clientY, state: mobileSheetState };
    hasMobileDraggedRef.current = false;
    setMobileDragY(0);
    setIsMobileDragging(false);
  }

  function onMobileDragPointerMove(e) {
    if (!mobileDragRef.current) return;
    const delta = e.clientY - mobileDragRef.current.startY;
    if (Math.abs(delta) > 8) {
      hasMobileDraggedRef.current = true;
      setIsMobileDragging(true);
    }
    if (hasMobileDraggedRef.current) setMobileDragY(delta);
  }

  function onMobileDragPointerUp(e) {
    if (!mobileDragRef.current) return;
    const delta = e.clientY - mobileDragRef.current.startY;
    const wasState = mobileDragRef.current.state;
    mobileDragRef.current = null;
    setIsMobileDragging(false);
    setMobileDragY(0);

    if (!hasMobileDraggedRef.current) return; // tap: no drag action

    if (wasState === "compact") {
      if (delta > 60) {
        onClose?.(); // drag down = dismiss, back to list
      } else if (delta < -50) {
        setMobileSheetState("full");
      }
    } else {
      if (delta > 50) {
        setMobileSheetState("compact");
      }
    }
  }

  return (
    <section className={sectionClassName} style={mobileSheetStyle}>
      {/*
        Mobile-only header — always visible as a flex shrink-0 child.
        It never scrolls away because the content below is the scrollable flex-1 body.
        Desktop: this is lg:hidden; the section itself handles padding and scrolling.
      */}
      {!isDetailVariant && (
        <div
          className="shrink-0 flex flex-col items-center border-b border-slate-100 bg-white px-4 pt-3 pb-2 lg:hidden"
          style={{ touchAction: isMobileLayout ? "none" : undefined }}
          onPointerDown={isMobileLayout ? onMobileDragPointerDown : undefined}
          onPointerMove={isMobileLayout ? onMobileDragPointerMove : undefined}
          onPointerUp={isMobileLayout ? onMobileDragPointerUp : undefined}
          onPointerCancel={
            isMobileLayout ? onMobileDragPointerUp : undefined
          }
        >
          {/* Drag pill */}
          <div className="mb-2.5 h-1.5 w-12 rounded-full bg-slate-300" />

          {/* Back + Close row */}
          <div className="flex w-full items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition active:bg-slate-200"
              aria-label="Back to events list"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                  clipRule="evenodd"
                />
              </svg>
              Back to events
            </button>

            <button
              type="button"
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500 transition active:bg-slate-200"
              aria-label="Close event preview"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/*
        Scrollable content body.
        Mobile: flex-1 min-h-0 overflow-y-auto — grows to fill available space below header.
        Desktop: lg:overflow-visible lg:p-4 — section handles overflow & padding.
      */}
      <div
        className={
          isDetailVariant
            ? undefined
            : "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] lg:overflow-visible lg:p-4 lg:pb-4"
        }
      >
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

        {eventSubcategories.length > 0 && (
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

        {saveMessage && (
          <p className="mt-3 rounded-2xl bg-pink-50 px-3 py-2 text-center text-xs font-semibold text-pink-700">
            {saveMessage}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleShareEvent}
            className="rounded-2xl border border-slate-200 p-3 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            aria-label="Share event"
            title="Share"
          >
            <IconShare className="h-5 w-5" />
          </button>

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
              <div className="absolute bottom-full left-0 mb-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm shadow-2xl shadow-slate-900/15">
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

          {eventUrl && (
            <a
              href={eventUrl}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center rounded-2xl border border-transparent bg-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/25 transition hover:bg-pink-600"
            >
              Tickets
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
