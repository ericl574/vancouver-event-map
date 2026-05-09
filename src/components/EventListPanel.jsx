import EventCard from "./EventCard";

export default function EventListPanel({
  events,
  selectedEvent,
  onSelectEvent,
  title = "Events in Greater Vancouver",
}) {
  return (
    <aside className="absolute bottom-6 left-6 top-36 z-30 hidden w-80 flex-col rounded-3xl bg-white/95 p-4 shadow-xl backdrop-blur lg:flex">
      <div className="mb-4 shrink-0">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-slate-500">{events.length} events found</p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
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