import { useEffect, useRef, useState } from "react";
import EventCard from "./EventCard";
import { IconChevronDown } from "./Icons";

const INITIAL_VISIBLE = 10;

export default function EventListPanel({
  events,
  selectedEvent,
  onSelectEvent,
  title = "Events in Greater Vancouver",
  subtitle,
  onShowAllEvents,
  isOpen = true,
  onCollapse,
  onExpand,
  quickChips,
  contextLabel,
  eventCount,
  freeCount = 0,
  nearCount = 0,
  authSession,
}) {
  const itemRefs = useRef(new Map());
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [events]);

  useEffect(() => {
    if (!isOpen || !selectedEvent?.id) return;
    const selectedItem = itemRefs.current.get(String(selectedEvent.id));
    if (!selectedItem) return;
    selectedItem.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [isOpen, selectedEvent]);

  const handleTogglePanel = () => {
    if (isOpen) onCollapse?.();
    else onExpand?.();
  };

  const visibleEvents = events.slice(0, visibleCount);
  const hasMore = events.length > visibleCount;
  const isLocationContext = title !== "Events in Greater Vancouver";

  const statusText =
    contextLabel && contextLabel !== "Vancouver"
      ? `${contextLabel} in Vancouver`
      : "Greater Vancouver";

  return (
    <div
      className={`absolute bottom-4 left-5 top-[8.5rem] z-40 hidden w-[422px] transition-all duration-300 ease-out lg:block ${
        isOpen ? "translate-x-0 opacity-100" : "-translate-x-[452px] opacity-100"
      }`}
    >
      <aside className="relative flex h-full flex-col rounded-[28px] border border-slate-200/60 bg-white/97 shadow-2xl shadow-slate-900/12 backdrop-blur-xl">
        {/* Collapse / expand toggle */}
        <button
          type="button"
          onClick={handleTogglePanel}
          className={`absolute top-1/2 z-50 flex h-12 w-7 -translate-y-1/2 items-center justify-center rounded-xl text-base font-black shadow-lg transition-all duration-300 ease-out hover:scale-105 ${
            isOpen
              ? "-right-4 bg-[#F5569B] text-white shadow-pink-400/30 ring-1 ring-white/80"
              : "-right-11 bg-pink-100 text-pink-400 shadow-pink-200/30 ring-1 ring-pink-200 hover:bg-[#F5569B] hover:text-white"
          }`}
          aria-label={isOpen ? "Hide events list" : "Show events list"}
        >
          {isOpen ? "‹" : "›"}
        </button>

        {/* Header */}
        <div className="shrink-0 border-b border-slate-100 px-4 pb-3 pt-4">
          {/* Location context row — only when in a specific location/group mode */}
          {(isLocationContext || onShowAllEvents) && (
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-slate-800">{title}</h2>
                {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
              </div>
              {onShowAllEvents && (
                <button
                  type="button"
                  onClick={onShowAllEvents}
                  className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                >
                  Show all
                </button>
              )}
            </div>
          )}

          {/* Quick filter chips with icons */}
          {quickChips && quickChips.length > 0 && (
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
              {quickChips.map(({ label, icon: Icon, active, onSelect }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onSelect}
                  className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                    active
                      ? "border-pink-500 bg-pink-500 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600"
                  }`}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Status row with pink dot */}
          {contextLabel && (
            <div className="mt-2.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500" />
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{statusText}</span>
                {" · "}
                <span>{eventCount ?? events.length} events</span>
                {freeCount > 0 && <span> · {freeCount} free</span>}
                {nearCount > 0 && <span> · {nearCount} near you</span>}
              </p>
            </div>
          )}
        </div>

        {/* Event list */}
        <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3 pr-3">
          {visibleEvents.map((event) => (
            <div
              key={event.id}
              ref={(node) => {
                const eventId = String(event.id);
                if (node) itemRefs.current.set(eventId, node);
                else itemRefs.current.delete(eventId);
              }}
            >
              <EventCard
                event={event}
                isSelected={String(selectedEvent?.id) === String(event.id)}
                onClick={onSelectEvent}
                authSession={authSession}
              />
            </div>
          ))}
        </div>

        {/* View more footer */}
        {hasMore && (
          <div className="shrink-0 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setVisibleCount(events.length)}
              className="flex w-full items-center justify-center gap-1.5 py-3 text-sm font-semibold text-slate-500 transition hover:text-pink-600"
            >
              <span>View more events</span>
              <IconChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
