import { useEffect, useRef, useState } from "react";
import EventCard from "./EventCard";

export default function MobileEventListSheet({
  events,
  selectedEvent,
  onSelectEvent,
  title,
  subtitle,
  onShowAllEvents,
  isHidden = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const itemRefs = useRef(new Map());

  // Collapse whenever the sheet is hidden (event selected from map or elsewhere)
  useEffect(() => {
    if (isHidden) setIsExpanded(false);
  }, [isHidden]);

  // Scroll selected event into view when the sheet opens
  useEffect(() => {
    if (!isExpanded || !selectedEvent?.id) return;
    const el = itemRefs.current.get(String(selectedEvent.id));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [isExpanded, selectedEvent]);

  function handleSelectEvent(event) {
    onSelectEvent(event);
    setIsExpanded(false);
  }

  const transform = isHidden
    ? "translateY(100%)"
    : isExpanded
      ? "translateY(0)"
      : "translateY(calc(100% - 5rem - env(safe-area-inset-bottom, 0px)))";

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl shadow-slate-900/20 will-change-transform transition-transform duration-300 ease-out lg:hidden"
      style={{ maxHeight: "72dvh", transform }}
      aria-hidden={isHidden}
    >
      {/* Drag handle + collapsed summary — tap to toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex w-full shrink-0 flex-col items-center px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] text-left"
        style={isExpanded ? { paddingBottom: "0.75rem" } : undefined}
        aria-label={isExpanded ? "Collapse event list" : "Expand event list"}
      >
        <div className="mb-2.5 h-1 w-10 rounded-full bg-slate-300" />
        <div className="flex w-full items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">
              {title || "Events"}
            </p>
            <p className="text-xs text-slate-500">
              {subtitle ?? `${events.length} events found`}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {onShowAllEvents && isExpanded && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowAllEvents();
                  setIsExpanded(false);
                }}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                Show all
              </button>
            )}
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
      </button>

      {/* Divider — only visible when expanded */}
      <div className="mx-4 shrink-0 border-t border-slate-100" />

      {/* Scrollable event list */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] space-y-2.5">
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No events found.
          </p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              ref={(node) => {
                const id = String(event.id);
                if (node) itemRefs.current.set(id, node);
                else itemRefs.current.delete(id);
              }}
            >
              <EventCard
                event={event}
                isSelected={String(selectedEvent?.id) === String(event.id)}
                onClick={handleSelectEvent}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
