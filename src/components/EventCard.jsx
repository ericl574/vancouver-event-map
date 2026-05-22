import { useState, useEffect } from "react";
import CategoryIcon from "./CategoryIcon";
import { getCategoryById } from "../data/categories";
import { inferEventSubcategories } from "../utils/categoryTaxonomyUtils";
import { IconBookmark, IconShare, IconCalendarPlus } from "./Icons";

function getSavedEventsStorageKey(authSession) {
  const userId = authSession?.user?.id || "guest";
  return `vancouver-event-map:saved-events:${userId}`;
}

function readSavedEventIds(authSession) {
  try {
    const raw = window.localStorage.getItem(getSavedEventsStorageKey(authSession));
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeSavedEventIds(authSession, eventIds) {
  window.localStorage.setItem(
    getSavedEventsStorageKey(authSession),
    JSON.stringify([...new Set(eventIds.map(String))])
  );
}

function buildGoogleCalendarUrl(event) {
  const rawDate = event.event_date || event.eventDate;
  const rawStart = event.start_time || event.rawStartTime;
  const rawEnd = event.end_time || event.rawEndTime;

  if (!rawDate) return null;

  const parseDateTime = (dateStr, timeStr) => {
    const d = timeStr
      ? new Date(`${dateStr}T${timeStr}`)
      : new Date(`${dateStr}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  };

  const start = parseDateTime(rawDate, rawStart);
  if (!start) return null;

  const end = rawEnd ? parseDateTime(rawDate, rawEnd) : null;
  const finalEnd = end && end > start ? end : new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", event.title);
  url.searchParams.set("dates", `${fmt(start)}/${fmt(finalEnd)}`);
  url.searchParams.set("details", event.description || "Event from Vancouver Event Map");
  url.searchParams.set("location", [event.venue, event.area].filter(Boolean).join(", "));
  return url.toString();
}

function useEventActions(event, authSession) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    function sync() {
      if (!event?.id) { setIsSaved(false); return; }
      setIsSaved(readSavedEventIds(authSession).includes(String(event.id)));
    }
    sync();
    window.addEventListener("saved-events-updated", sync);
    return () => window.removeEventListener("saved-events-updated", sync);
  }, [event?.id, authSession?.user?.id]);

  function handleToggleSave(e) {
    e.stopPropagation();
    if (!authSession?.user) {
      window.location.href = "/login";
      return;
    }
    const eventId = String(event.id);
    const ids = readSavedEventIds(authSession);
    if (ids.includes(eventId)) {
      writeSavedEventIds(authSession, ids.filter((id) => id !== eventId));
      setIsSaved(false);
    } else {
      writeSavedEventIds(authSession, [...ids, eventId]);
      setIsSaved(true);
    }
    window.dispatchEvent(new Event("saved-events-updated"));
  }

  async function handleShare(e) {
    e.stopPropagation();
    const url = `${window.location.origin}/?event=${event.id}`;
    const text = [event.title, event.venue, event.date].filter(Boolean).join(" · ");
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
      }
    } catch (err) {
      if (err.name !== "AbortError") console.error("Share failed:", err);
    }
  }

  function handleCalendar(e) {
    e.stopPropagation();
    const calUrl = buildGoogleCalendarUrl(event);
    if (calUrl) window.open(calUrl, "_blank", "noopener,noreferrer");
  }

  return { isSaved, handleToggleSave, handleShare, handleCalendar };
}

export default function EventCard({ event, isSelected, onClick, authSession, showActions = true }) {
  const category = getCategoryById(event.category);
  const eventSubcategories = inferEventSubcategories(event);
  const eventUrl = event.ticketUrl || event.sourceUrl || "";
  const { isSaved, handleToggleSave, handleShare, handleCalendar } = useEventActions(event, authSession);

  // ── Featured (selected) layout — side-by-side image + content ───────────
  if (isSelected) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick(event)}
        onKeyDown={(e) => e.key === "Enter" && onClick(event)}
        className="w-full cursor-pointer overflow-hidden rounded-[20px] border-2 border-pink-400 bg-white shadow-md shadow-slate-900/10 outline-none"
      >
        {/* Side-by-side: square image left, category+title+tags right */}
        <div className="flex">
          {/* Left: square image with FEATURED badge */}
          <div className="relative m-2 h-[120px] w-[120px] shrink-0 overflow-hidden rounded-2xl bg-slate-100">
            {event.imageUrl ? (
              <img
                src={event.imageUrl}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.parentElement.style.background = `linear-gradient(135deg, ${category.hex}22, ${category.hex}44)`;
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${category.hex}20, ${category.hex}38)` }}
              >
                <span style={{ color: category.hex }} className="opacity-40">
                  <CategoryIcon icon={category.icon} className="h-10 w-10" />
                </span>
              </div>
            )}
            <div className="absolute left-1.5 top-1.5">
              <span className="rounded-full bg-pink-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm">
                FEATURED
              </span>
            </div>
          </div>

          {/* Right: category + title + meta + tags */}
          <div className="min-w-0 flex-1 pb-2 pr-3 pt-3">
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: category.hex }}>
              {category.label}
            </div>

            <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-slate-950">
              {event.title}
            </h3>

            <p className="mt-1 truncate text-[10px] text-slate-500">
              {[event.venue, event.area].filter(Boolean).join(" · ")}
            </p>

            {(event.date || event.startTime || event.price) && (
              <p className="mt-0.5 truncate text-[10px] text-slate-600">
                {[event.date, event.startTime, event.price].filter(Boolean).join(" · ")}
              </p>
            )}

            {eventSubcategories.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {eventSubcategories.slice(0, 2).map((sub) => (
                  <span key={sub.id} className="rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-bold text-pink-600 ring-1 ring-pink-100">
                    {sub.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action row */}
        {showActions && (
          <div
            className="flex items-center gap-1.5 border-t border-slate-100 px-3 pb-2.5 pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleToggleSave}
              className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-bold transition ${
                isSaved
                  ? "border-pink-200 bg-pink-50 text-pink-600"
                  : "border-slate-200 bg-slate-50 text-slate-500 hover:border-pink-200 hover:text-pink-600"
              }`}
            >
              <IconBookmark className={`h-3 w-3 ${isSaved ? "fill-current" : ""}`} />
              <span>Save</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              <IconShare className="h-3 w-3" />
              <span>Share</span>
            </button>
            <button
              type="button"
              onClick={handleCalendar}
              className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              <IconCalendarPlus className="h-3 w-3" />
              <span>Add to calendar</span>
            </button>
            {eventUrl && (
              <a
                href={eventUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex flex-1 items-center justify-center whitespace-nowrap rounded-full bg-pink-500 px-2 py-1 text-[10px] font-bold text-white transition hover:bg-pink-600"
              >
                Tickets
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Compact list card — with right-side bookmark ─────────────────────────
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(event)}
      onKeyDown={(e) => e.key === "Enter" && onClick(event)}
      className="w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white/95 text-left transition hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex items-start">
        {/* Thumbnail — true square sized so image height drives card height */}
        <div className="relative m-2 h-[108px] w-[108px] shrink-0 overflow-hidden rounded-2xl bg-slate-100">
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ backgroundColor: `${category.hex}18` }}
            >
              <span style={{ color: category.hex }}>
                <CategoryIcon icon={category.icon} className="h-7 w-7" />
              </span>
            </div>
          )}
        </div>

        {/* Text — all meta at text-[10px] to fit within image height */}
        <div className="min-w-0 flex-1 py-2 pl-2 pr-1">
          <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: category.hex || "#64748b" }}>
            {category.label}
          </div>

          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
            {event.title}
          </h3>

          <p className="mt-0.5 truncate text-[10px] text-slate-500">
            {[event.venue, event.area].filter(Boolean).join(" · ")}
          </p>

          {(event.date || event.startTime || event.price) && (
            <p className="mt-0.5 truncate text-[10px] text-slate-600">
              {[event.date, event.startTime, event.price].filter(Boolean).join(" · ")}
            </p>
          )}

          {eventSubcategories.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {eventSubcategories.slice(0, 2).map((sub) => (
                <span key={sub.id} className="rounded-full bg-pink-50 px-1.5 py-0.5 text-[10px] font-bold text-pink-600 ring-1 ring-pink-100">
                  {sub.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bookmark button */}
        <div className="flex shrink-0 items-start px-2 pt-2">
          <button
            type="button"
            onClick={handleToggleSave}
            title={isSaved ? "Unsave" : "Save"}
            className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
              isSaved
                ? "border-pink-200 bg-pink-50 text-pink-600"
                : "border-slate-200 bg-white text-slate-400 hover:border-pink-200 hover:text-pink-500"
            }`}
          >
            <IconBookmark className={`h-3.5 w-3.5 ${isSaved ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
