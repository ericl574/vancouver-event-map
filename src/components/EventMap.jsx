import EventMarker from "./EventMarker";

export default function EventMap({ events, selectedEvent, onSelectEvent }) {
  return (
    <section
      className="absolute inset-0"
      aria-label="Vancouver event map prototype"
    >
      <div className="relative h-full w-full bg-[linear-gradient(90deg,#dbeafe_1px,transparent_1px),linear-gradient(#dbeafe_1px,transparent_1px)] bg-[size:48px_48px]">
        <div className="absolute left-[8%] top-[18%] h-[70%] w-[72%] rounded-[45%] bg-blue-100/70 blur-sm" />
        <div className="absolute left-[34%] top-[10%] h-[78%] w-24 -rotate-12 rounded-full bg-slate-200/90" />
        <div className="absolute left-[48%] top-[0%] h-full w-20 rotate-6 rounded-full bg-slate-200/90" />
        <div className="absolute left-[0%] top-[52%] h-20 w-full -rotate-6 bg-slate-200/90" />

        <div className="absolute left-[62%] top-[28%] rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 shadow">
          Downtown
        </div>

        <div className="absolute left-[30%] top-[64%] rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 shadow">
          UBC / West Side
        </div>

        <div className="absolute left-[57%] top-[66%] rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 shadow">
          False Creek
        </div>

        {events.map((event) => (
          <EventMarker
            key={event.id}
            event={event}
            isSelected={selectedEvent?.id === event.id}
            onClick={onSelectEvent}
          />
        ))}
      </div>
    </section>
  );
}