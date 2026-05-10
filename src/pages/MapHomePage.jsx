import { useEffect, useMemo, useState } from "react";
import CategoryChips from "../components/CategoryChips";
import EmptyState from "../components/EmptyState";
import EventListPanel from "../components/EventListPanel";
import EventMap from "../components/EventMap";
import EventPreviewCard from "../components/EventPreviewCard";
import FilterPanel from "../components/FilterPanel";
import { IconLocate } from "../components/Icons";
import SearchBar from "../components/SearchBar";
import { getApprovedEvents } from "../services/eventService";
import { geocodeAddress } from "../services/geocodingService";
import { addDistanceFromPoint, filterEvents } from "../utils/eventUtils";

export default function MapHomePage() {
  const [events, setEvents] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedLocationGroup, setSelectedLocationGroup] = useState(null);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
  timeRange: "all",
  exactDate: "",
});

  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState("");

  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadEvents() {
      try {
        setIsLoadingEvents(true);
        setEventsError("");

        const approvedEvents = await getApprovedEvents();

        if (!isMounted) return;

        setEvents(approvedEvents);
        setSelectedEvent(approvedEvents[0] ?? null);
      } catch (error) {
        console.error("Failed to load events:", error);

        if (!isMounted) return;

        setEventsError("Could not load events from the database.");
        setEvents([]);
        setSelectedEvent(null);
      } finally {
        if (isMounted) {
          setIsLoadingEvents(false);
        }
      }
    }

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, []);

  const eventSearchQuery = destinationLocation ? "" : query;

const filteredEvents = useMemo(() => {
  return filterEvents(events, selectedCategory, eventSearchQuery, filters);
}, [events, selectedCategory, eventSearchQuery, filters]);

const displayedEvents = useMemo(() => {
  return addDistanceFromPoint(filteredEvents, destinationLocation);
}, [filteredEvents, destinationLocation]);

  const sidebarEvents = selectedLocationGroup?.events ?? displayedEvents;

  const sidebarTitle = selectedLocationGroup
  ? selectedLocationGroup.venue || "Events at this location"
  : destinationLocation
    ? `Events near ${destinationLocation.shortLabel || "selected location"}`
    : "Events in Greater Vancouver";

const sidebarSubtitle = selectedLocationGroup
  ? `${selectedLocationGroup.events.length} event${
      selectedLocationGroup.events.length === 1 ? "" : "s"
    } at this location`
  : destinationLocation
    ? `${displayedEvents.length} events sorted by distance`
    : `${displayedEvents.length} events found`;

  useEffect(() => {
    setSelectedLocationGroup(null);
  }, [selectedCategory, query, filters]);

  useEffect(() => {
    if (sidebarEvents.length === 0) {
      setSelectedEvent(null);
      return;
    }

    const selectedEventStillVisible = sidebarEvents.some(
      (event) => event.id === selectedEvent?.id
    );

    if (selectedEventStillVisible) {
      return;
    }

    // When a reference address is pinned, keep the map focused on that address.
    // Do not auto-select the nearest event and steal the camera.
    if (destinationLocation) {
      setSelectedEvent(null);
      return;
    }

    setSelectedEvent(sidebarEvents[0]);
  }, [sidebarEvents, selectedEvent?.id, destinationLocation]);

  function handleSelectEvent(event) {
    setSelectedLocationGroup(null);
    setSelectedEvent(event);
  }

  function handleSelectLocationGroup(group) {
    setSelectedLocationGroup({
      key: group.key,
      venue: group.primaryEvent?.venue || "This location",
      events: group.events,
    });

    setSelectedEvent(group.primaryEvent);
  }

  function handleShowAllEvents() {
  setSelectedLocationGroup(null);
  setDestinationLocation(null);
  setLocationSearchError("");
  setQuery("");
  setSelectedEvent(filteredEvents[0] ?? null);
}
  function handleQueryChange(value) {
  setQuery(value);
  setLocationSearchError("");

  if (destinationLocation) {
    setDestinationLocation(null);
  }
}

async function handleSearchLocation(searchText) {
  const trimmedSearchText = searchText.trim();

  if (!trimmedSearchText) return;

  try {
    setIsSearchingLocation(true);
    setLocationSearchError("");

    const result = await geocodeAddress(trimmedSearchText);

    if (!result) {
      setLocationSearchError("Could not find that location.");
      return;
    }

    setDestinationLocation(result);
    setSelectedLocationGroup(null);
    setSelectedEvent(null);
  } catch (error) {
    console.error("Location search failed:", error);
    setLocationSearchError("Could not search that location.");
  } finally {
    setIsSearchingLocation(false);
  }
}

function handleClearDestinationLocation() {
  setDestinationLocation(null);
  setLocationSearchError("");
  setQuery("");
  setSelectedLocationGroup(null);
  setSelectedEvent(displayedEvents[0] ?? null);
}
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

  function handleResetFilters() {
  setFilters({
    timeRange: "all",
    exactDate: "",
  });
}

  return (
    <main className="relative h-screen w-full overflow-hidden bg-slate-100 text-slate-900">
      <EventMap
  events={displayedEvents}
  selectedEvent={selectedEvent}
  onSelectEvent={handleSelectEvent}
  onSelectLocationGroup={handleSelectLocationGroup}
  userLocation={userLocation}
  destinationLocation={destinationLocation}
/>

      {!isLoadingEvents && displayedEvents.length === 0 && <EmptyState />}

      <header className="pointer-events-none absolute inset-x-0 top-0 z-50 p-4">
        <div className="pointer-events-auto mx-auto max-w-5xl">
          <SearchBar
            query={query}
            onQueryChange={handleQueryChange}
            onFilterClick={() => setIsFilterOpen(true)}
            onSearchSubmit={handleSearchLocation}
            isSearchingLocation={isSearchingLocation}
          />

          <CategoryChips
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
          {(destinationLocation || locationSearchError) && (
  <div className="mt-2 flex flex-wrap items-center gap-2">
    {destinationLocation && (
      <div className="rounded-2xl bg-white/95 px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg backdrop-blur">
        Reference: {destinationLocation.shortLabel}
        <button
          type="button"
          onClick={handleClearDestinationLocation}
          className="ml-3 text-rose-600 hover:underline"
        >
          Clear
        </button>
      </div>
    )}

    {locationSearchError && (
      <div className="rounded-2xl bg-white/95 px-4 py-2 text-sm font-semibold text-red-600 shadow-lg backdrop-blur">
        {locationSearchError}
      </div>
    )}
  </div>
)}
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

      {(isLoadingEvents || eventsError) && (
        <div className="absolute left-1/2 top-32 z-50 -translate-x-1/2 rounded-2xl bg-white/95 px-4 py-3 text-sm shadow-lg backdrop-blur">
          {isLoadingEvents && (
            <p className="font-medium text-slate-700">Loading events...</p>
          )}

          {eventsError && (
            <p className="font-medium text-red-600">{eventsError}</p>
          )}
        </div>
      )}

      <EventListPanel
        events={sidebarEvents}
        selectedEvent={selectedEvent}
        onSelectEvent={handleSelectEvent}
        title={sidebarTitle}
        subtitle={sidebarSubtitle}
        onShowAllEvents={
  selectedLocationGroup || destinationLocation
    ? handleShowAllEvents
    : undefined
}
      />

      <EventPreviewCard event={selectedEvent} />

      <FilterPanel
        isOpen={isFilterOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setIsFilterOpen(false)}
        onReset={handleResetFilters}
      />
    </main>
  );
}