import { useEffect, useRef } from "react";
import EventCard from "./EventCard";

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

  useEffect(() => {
    if (!isOpen || !selectedEvent?.id) return;

    const selectedItem = itemRefs.current.get(String(selectedEvent.id));

    if (!selectedItem) return;

    selectedItem.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [isOpen, selectedEvent]);

  const handleTogglePanel = () => {
    if (isOpen) {
      onCollapse?.();
    } else {
      onExpand?.();
    }
  };

  return (
    <div
      className={`absolute bottom-4 left-5 top-[8.5rem] z-40 hidden w-[360px] transition-all duration-300 ease-out lg:block ${
        isOpen
          ? "translate-x-0 opacity-100"
          : "-translate-x-[390px] opacity-100"
      }`}
    >
      <aside className="relative flex h-full flex-col rounded-[28px] border border-slate-200/60 bg-white/97 shadow-2xl shadow-slate-900/12 backdrop-blur-xl">
        <button
          type="button"
          onClick={handleTogglePanel}
          className={`absolute top-1/2 z-50 flex h-14 w-9 -translate-y-1/2 items-center justify-center rounded-2xl bg-slate-950 text-xl font-black text-white shadow-xl shadow-slate-900/20 ring-1 ring-white/80 transition-all duration-300 ease-out hover:scale-105 hover:bg-pink-600 ${
            isOpen ? "-right-5" : "-right-14"
          }`}
          aria-label={isOpen ? "Hide events list" : "Show events list"}
        >
          {isOpen ? "‹" : "›"}
        </button>

        <div className="shrink-0 border-b border-slate-100 px-4 pb-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-black tracking-tight text-slate-950">
                {title}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-slate-400">
                {subtitle ?? `${events.length} events found`}
              </p>
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

          {quickChips && quickChips.length > 0 && (
            <div className="mt-3">
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
                {quickChips.map(({ label, active, onSelect }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={onSelect}
                    className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                      active
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400 hover:text-slate-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {contextLabel && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-600">{contextLabel}</span>
                  <span>·</span>
                  <span>{eventCount ?? events.length} events</span>
                  {freeCount > 0 && <><span>·</span><span>{freeCount} free</span></>}
                  {nearCount > 0 && <><span>·</span><span>{nearCount} near you</span></>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3 pr-3">
          {events.map((event) => (
            <div
              key={event.id}
              ref={(node) => {
                const eventId = String(event.id);

                if (node) {
                  itemRefs.current.set(eventId, node);
                } else {
                  itemRefs.current.delete(eventId);
                }
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
      </aside>
    </div>
  );
}
