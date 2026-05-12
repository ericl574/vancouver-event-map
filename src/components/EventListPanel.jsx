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
      className={`absolute bottom-5 left-5 top-36 z-40 hidden w-[360px] transition-all duration-300 ease-out lg:block ${
        isOpen
          ? "translate-x-0 opacity-100"
          : "-translate-x-[390px] opacity-100"
      }`}
    >
      <aside className="relative flex h-full flex-col rounded-[28px] border border-slate-200/70 bg-white/95 p-4 shadow-xl shadow-slate-900/10 backdrop-blur-xl">
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

        <div className="mb-3 shrink-0 border-b border-slate-100 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-950">
                {title}
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-500">
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
        </div>

        <div className="no-scrollbar min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
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
              />
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
