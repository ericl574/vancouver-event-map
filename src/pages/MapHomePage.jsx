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

  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

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

  function handleUseCurrentLocation() {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Your browser does not support location.");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        setUserLocation({
          lat: latitude,
          lng: longitude,
        });

        setIsLocating(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError("Location permission was denied.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError("Your location is currently unavailable.");
        } else if (error.code === error.TIMEOUT) {
          setLocationError("Location request timed out.");
        } else {
          setLocationError("Could not get your location.");
        }

        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }

  return (
    <main className="relative h-screen w-full overflow-hidden bg-slate-100 text-slate-900">
      <EventMap
        events={filteredEvents}
        selectedEvent={selectedEvent}
        onSelectEvent={setSelectedEvent}
        userLocation={userLocation}
      />

      {filteredEvents.length === 0 && <EmptyState />}

      <header className="pointer-events-none absolute inset-x-0 top-0 z-50 p-4">
        <div className="pointer-events-auto mx-auto max-w-5xl">
          <SearchBar query={query} onQueryChange={setQuery} />

          <CategoryChips
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>
      </header>

      <div className="absolute right-4 top-36 z-50 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="rounded-full bg-white p-3 shadow-lg transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          aria-label="Use current location"
          title="Use current location"
        >
          {isLocating ? (
            <span className="flex h-5 w-5 items-center justify-center text-sm font-bold text-slate-700">
              …
            </span>
          ) : (
            <IconLocate className="h-5 w-5 text-slate-700" />
          )}
        </button>

        {locationError && (
          <div className="max-w-64 rounded-2xl bg-white/95 px-4 py-2 text-right text-sm text-red-600 shadow-lg backdrop-blur">
            {locationError}
          </div>
        )}
      </div>

      <EventListPanel
        events={filteredEvents}
        selectedEvent={selectedEvent}
        onSelectEvent={setSelectedEvent}
      />

      <EventPreviewCard event={selectedEvent} />
    </main>
  );
}