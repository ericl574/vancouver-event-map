import { useEffect, useMemo, useState } from "react";
import CategoryChips from "../components/CategoryChips";
import EmptyState from "../components/EmptyState";
import EventListPanel from "../components/EventListPanel";
import EventMap from "../components/EventMap";
import EventPreviewCard from "../components/EventPreviewCard";
import FilterPanel from "../components/FilterPanel";
import { IconLocate } from "../components/Icons";
import SearchBar from "../components/SearchBar";
import { getCurrentSession, signOutUser } from "../services/authService";
import { getApprovedEvents } from "../services/eventService";
import { geocodeAddress } from "../services/geocodingService";
import { addDistanceFromPoint, filterEvents } from "../utils/eventUtils";

const TIME_FILTER_SUMMARIES = {
  "24h": {
    label: "Next 24 hours",
    description: "Events starting within 1 day",
  },
  "3d": {
    label: "Next 3 days",
    description: "Events starting within 3 days",
  },
  "5d": {
    label: "Next 5 days",
    description: "Events starting within 5 days",
  },
  "1w": {
    label: "Next 1 week",
    description: "Events starting within 7 days",
  },
  "30d": {
    label: "Next 30 days",
    description: "Default map view",
  },
  "3m": {
    label: "Next 3 months",
    description: "Planning ahead",
  },
  "6m": {
    label: "Next 6 months",
    description: "Longer-term events",
  },
  "1y": {
    label: "Next year",
    description: "Events up to 1 year ahead",
  },
  all: {
    label: "All upcoming",
    description: "Show every stored upcoming event",
  },
};

function getActiveFilterSummary(filters) {
  if (filters.exactDate) {
    return {
      label: "Exact date",
      description: `Events happening on ${filters.exactDate}`,
    };
  }

  return TIME_FILTER_SUMMARIES[filters.timeRange] ?? null;
}

function getCurrentPositionAsync() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      reject,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

export default function MapHomePage() {
  const [events, setEvents] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedLocationGroup, setSelectedLocationGroup] = useState(null);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isEventListPanelOpen, setIsEventListPanelOpen] = useState(true);
  const [filters, setFilters] = useState({
    timeRange: "30d",
    exactDate: "",
  });

  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState("");

  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [nearestEvent, setNearestEvent] = useState(null);
  const [nearestError, setNearestError] = useState("");
  const [isFindingNearest, setIsFindingNearest] = useState(false);

  const [destinationLocation, setDestinationLocation] = useState(null);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState("");

  const [authSession, setAuthSession] = useState(null);
  const [isCheckingUserSession, setIsCheckingUserSession] = useState(true);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadEvents() {
      try {
        setIsLoadingEvents(true);
        setEventsError("");

        const approvedEvents = await getApprovedEvents();

        if (!isMounted) return;

        setEvents(approvedEvents);
        setSelectedEvent(null);
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

  useEffect(() => {
    let isMounted = true;

    async function loadUserSession() {
      try {
        setIsCheckingUserSession(true);
        setAuthError("");

        const session = await getCurrentSession();

        if (!isMounted) return;

        setAuthSession(session);
      } catch (error) {
        console.error("Failed to load user session:", error);

        if (!isMounted) return;

        setAuthSession(null);
        setAuthError("Could not check login status.");
      } finally {
        if (isMounted) {
          setIsCheckingUserSession(false);
        }
      }
    }

    loadUserSession();

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
    setNearestEvent(null);
    setNearestError("");
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

    setSelectedEvent(null);
  }, [sidebarEvents, selectedEvent?.id, destinationLocation]);

  function handleSelectEvent(event) {
    setSelectedLocationGroup(null);
    setSelectedEvent(event);

    if (event?.distanceKm !== undefined) {
      setNearestEvent(event);
    }
  }

  function handleClearMapSelection() {
    setSelectedEvent(null);
    setSelectedLocationGroup(null);
  }

  function handleMapBackgroundClick() {
    setIsFilterOpen(false);
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
    setNearestEvent(null);
    setNearestError("");
    setQuery("");
    setSelectedEvent(filteredEvents[0] ?? null);
  }

  function handleQueryChange(value) {
    setQuery(value);
    setLocationSearchError("");
    setNearestEvent(null);
    setNearestError("");

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
      setNearestEvent(null);
      setNearestError("");

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
    setNearestEvent(null);
    setNearestError("");
    setSelectedEvent(filteredEvents[0] ?? null);
  }

  async function handleUseCurrentLocation() {
    setLocationError("");
    setNearestError("");

    try {
      setIsLocating(true);

      const location = await getCurrentPositionAsync();

      setUserLocation(location);
    } catch (error) {
      if (error.code === 1) {
        setLocationError("Location permission was denied.");
      } else if (error.code === 2) {
        setLocationError("Your location is currently unavailable.");
      } else if (error.code === 3) {
        setLocationError("Location request timed out.");
      } else {
        setLocationError("Could not get your location.");
      }
    } finally {
      setIsLocating(false);
    }
  }

  async function handleFindNearestEvent() {
    setNearestError("");
    setLocationError("");
    setIsFindingNearest(true);

    try {
      let location = userLocation;

      if (!location?.lat || !location?.lng) {
        location = await getCurrentPositionAsync();
        setUserLocation(location);
      }

      const eventsWithDistance = addDistanceFromPoint(
        filteredEvents,
        location
      ).filter((event) => Number.isFinite(event.distanceKm));

      const closestEvent = eventsWithDistance[0];

      if (!closestEvent) {
        setNearestEvent(null);
        setNearestError("No nearby events found.");
        return;
      }

      setNearestEvent(closestEvent);
      setSelectedLocationGroup(null);
      setDestinationLocation(null);
      setLocationSearchError("");
      setSelectedEvent(closestEvent);
    } catch (error) {
      console.error("Could not find nearest event:", error);

      setNearestEvent(null);

      if (error.code === 1) {
        setNearestError("Location permission was denied.");
      } else if (error.code === 2) {
        setNearestError("Your location is currently unavailable.");
      } else if (error.code === 3) {
        setNearestError("Location request timed out.");
      } else {
        setNearestError("Could not find your location.");
      }
    } finally {
      setIsFindingNearest(false);
    }
  }

  async function handleUserSignOut() {
    try {
      setAuthError("");
      setIsAccountMenuOpen(false);

      await signOutUser();

      setAuthSession(null);
    } catch (error) {
      console.error("User sign out failed:", error);
      setAuthError("Could not log out.");
    }
  }

  function getUserInitial() {
    const email = authSession?.user?.email || "";
    return email.trim().charAt(0).toUpperCase() || "U";
  }

  function handleResetFilters() {
    setFilters({
      timeRange: "all",
      exactDate: "",
    });

    setNearestEvent(null);
    setNearestError("");
  }

  const activeFilterSummary = getActiveFilterSummary(filters);

  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    let pointerStart = null;

    function isInsideFilterUi(target) {
      return Boolean(
        target instanceof Element &&
          target.closest("[data-filter-panel], [data-filter-toggle]")
      );
    }

    function handlePointerDown(event) {
      pointerStart = {
        x: event.clientX,
        y: event.clientY,
        target: event.target,
      };
    }

    function handlePointerUp(event) {
      if (!pointerStart) {
        return;
      }

      const deltaX = event.clientX - pointerStart.x;
      const deltaY = event.clientY - pointerStart.y;
      const movedDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      const startedInsideFilterUi = isInsideFilterUi(pointerStart.target);
      const endedInsideFilterUi = isInsideFilterUi(event.target);

      pointerStart = null;

      if (movedDistance > 6) {
        return;
      }

      if (startedInsideFilterUi || endedInsideFilterUi) {
        return;
      }

      setIsFilterOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointerup", handlePointerUp, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointerup", handlePointerUp, true);
    };
  }, [isFilterOpen]);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-slate-100 text-slate-900">
      <EventMap
        events={displayedEvents}
        selectedEvent={selectedEvent}
        onSelectEvent={handleSelectEvent}
        onSelectLocationGroup={handleSelectLocationGroup}
        onClearSelection={handleClearMapSelection}
        userLocation={userLocation}
        destinationLocation={destinationLocation}
      />

      <div
        className="absolute right-4 top-5 z-[60] flex flex-col items-end gap-3"
        aria-label="Map quick controls"
      >
        <div className="flex w-full flex-col items-end gap-3">
          <div className="self-end" aria-label="User account">
            {authSession?.user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
                  className="group flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-600 text-lg font-black text-white shadow-xl shadow-purple-900/25 ring-4 ring-white/90 transition duration-200 hover:-translate-y-0.5 hover:scale-105"
                  aria-label="Open account menu"
                  title={authSession.user.email}
                >
                  <span className="drop-shadow-sm">{getUserInitial()}</span>
                </button>

                {isAccountMenuOpen && (
                  <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/95 text-slate-800 shadow-2xl shadow-slate-900/20 backdrop-blur">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Signed in as
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold">
                        {authSession.user.email}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleUserSignOut}
                      className="block w-full px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-pink-50 hover:text-pink-600"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <a
                href="/login"
                className="flex h-12 items-center rounded-full bg-slate-950 px-4 text-sm font-bold text-white shadow-xl shadow-slate-900/25 ring-4 ring-white/90 transition duration-200 hover:-translate-y-0.5 hover:bg-pink-600"
              >
                {isCheckingUserSession ? "Checking..." : "Log in"}
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="flex h-12 w-12 items-center justify-center self-end rounded-full bg-white/95 text-slate-800 shadow-xl shadow-slate-900/15 ring-1 ring-slate-200/80 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
            aria-label="Use current location"
            title="Use current location"
          >
            {isLocating ? (
              <span className="flex h-5 w-5 items-center justify-center text-sm font-black">
                …
              </span>
            ) : (
              <IconLocate className="h-5 w-5" />
            )}
          </button>

          <button
            type="button"
            onClick={handleFindNearestEvent}
            disabled={isFindingNearest || isLoadingEvents || filteredEvents.length === 0}
            className="group flex items-center justify-end gap-2 self-end rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 px-5 py-3 text-sm font-black text-white shadow-xl shadow-rose-900/25 ring-4 ring-white/90 transition duration-200 hover:-translate-y-0.5 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Find nearest event"
            title="Find nearest event"
          >
            <span className="transition group-hover:rotate-12">✨</span>
            <span>{isFindingNearest ? "Finding..." : "Nearest"}</span>
          </button>
        </div>

        {authError && (
          <div className="max-w-56 rounded-2xl bg-white/95 px-4 py-2 text-right text-sm font-semibold text-red-600 shadow-lg backdrop-blur">
            {authError}
          </div>
        )}

        {locationError && (
          <div className="max-w-64 rounded-2xl bg-white/95 px-4 py-2 text-right text-sm text-red-600 shadow-lg backdrop-blur">
            {locationError}
          </div>
        )}
      </div>

      {!isLoadingEvents && displayedEvents.length === 0 && <EmptyState />}

      <header className="pointer-events-none absolute inset-x-0 top-0 z-50 p-4">
        <div className="pointer-events-auto mx-auto max-w-5xl">
          <SearchBar
            query={query}
            onQueryChange={handleQueryChange}
            onFilterClick={() => setIsFilterOpen((isOpen) => !isOpen)}
            onSearchSubmit={handleSearchLocation}
            isSearchingLocation={isSearchingLocation}
            activeFilterSummary={activeFilterSummary}
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

          {(nearestEvent || nearestError) && (
  <div className="pointer-events-none fixed left-1/2 top-34 z-50 -translate-x-1/2">
    {nearestEvent && Number.isFinite(nearestEvent.distanceKm) && (
      <div className="rounded-2xl bg-white/95 px-5 py-2.5 text-center text-sm font-semibold text-slate-700 shadow-lg backdrop-blur">
        Nearest:{" "}
        <span className="text-pink-600">{nearestEvent.title}</span>
        <span className="ml-1 text-slate-500">
          · {nearestEvent.distanceKm.toFixed(1)} km away
        </span>
      </div>
    )}

    {nearestError && (
      <div className="rounded-2xl bg-white/95 px-5 py-2.5 text-center text-sm font-semibold text-red-600 shadow-lg backdrop-blur">
        {nearestError}
      </div>
    )}
  </div>
)}
        </div>
      </header>

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
        isOpen={isEventListPanelOpen}
        onCollapse={() => setIsEventListPanelOpen(false)}
        onExpand={() => setIsEventListPanelOpen(true)}
        title={sidebarTitle}
        subtitle={sidebarSubtitle}
        onShowAllEvents={
          selectedLocationGroup || destinationLocation
            ? handleShowAllEvents
            : undefined
        }
      />

      {selectedEvent && <EventPreviewCard event={selectedEvent} />}

      <FilterPanel
        isOpen={isFilterOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setIsFilterOpen(false)}
      />
    </main>
  );
}
