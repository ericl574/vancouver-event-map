import { useEffect, useMemo, useState } from "react";
import CategoryChips from "../components/CategoryChips";
import EmptyState from "../components/EmptyState";
import EventListPanel from "../components/EventListPanel";
import EventMap from "../components/EventMap";
import EventPreviewCard from "../components/EventPreviewCard";
import { IconLocate } from "../components/Icons";
import SearchBar from "../components/SearchBar";
import { mockEvents } from "../data/mockEvents";
import { filterEvents } from "../utils/eventUtils";

export default function MapHomePage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(mockEvents[0]);

  const filteredEvents = useMemo(() => {
    return filterEvents(mockEvents, selectedCategory, query);
  }, [selectedCategory, query]);

  useEffect(() => {
    if (filteredEvents.length === 0) {
      setSelectedEvent(null);
      return;
    }

    const selectedEventStillVisible = filteredEvents.some(
      (event) => event.id === selectedEvent?.id
    );

    if (!selectedEventStillVisible) {
      setSelectedEvent(filteredEvents[0]);
    }
  }, [filteredEvents, selectedEvent?.id]);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-slate-100 text-slate-900">
      <EventMap
        events={filteredEvents}
        selectedEvent={selectedEvent}
        onSelectEvent={setSelectedEvent}
      />

      {filteredEvents.length === 0 && <EmptyState />}

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 p-4">
        <div className="pointer-events-auto mx-auto max-w-5xl">
          <SearchBar query={query} onQueryChange={setQuery} />

          <CategoryChips
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>
      </header>

      <button
        type="button"
        className="absolute right-4 top-36 z-30 rounded-full bg-white p-3 shadow-lg hover:bg-slate-50"
        aria-label="Use current location"
      >
        <IconLocate className="h-5 w-5 text-slate-700" />
      </button>

      <EventListPanel
        events={filteredEvents}
        selectedEvent={selectedEvent}
        onSelectEvent={setSelectedEvent}
      />

      <EventPreviewCard event={selectedEvent} />
    </main>
  );
}