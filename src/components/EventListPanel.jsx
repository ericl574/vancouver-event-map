import EventCard from "./EventCard";

export default function EventListPanel({
  events,
  selectedEvent,
  onSelectEvent,
  title = "Events in Greater Vancouver",
}) {
  return (
    <aside className="absolute bottom-6 left-6 top-40 z-40 hidden w-[340px] flex-col rounded-[2rem] border border-white/70 bg-white/85 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur-xl lg:flex">
      <div className="mb-4 shrink-0">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{events.length} events found</p>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
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