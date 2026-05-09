import EventCard from "./EventCard";

export default function EventListPanel({
  events,
  selectedEvent,
  onSelectEvent,
  title = "Events in Greater Vancouver",
}) {
  return (
    <aside className="absolute bottom-5 left-5 top-36 z-40 hidden w-[360px] flex-col rounded-[28px] border border-slate-200/70 bg-white/95 p-4 shadow-xl shadow-slate-900/10 backdrop-blur-xl lg:flex">
      <div className="mb-3 shrink-0 border-b border-slate-100 pb-3">
        <h2 className="text-lg font-bold tracking-tight text-slate-950">
          {title}
        </h2>

        <p className="mt-1 text-sm font-medium text-slate-500">
          {events.length} events found
        </p>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isSelected={selectedEvent?.id === event.id}
            onClick={onSelectEvent}
          />
        ))}
      </div>
    </aside>
  );
}