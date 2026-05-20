import { useEffect, useMemo, useState } from "react";
import TopNavigation from "../components/TopNavigation";
import EmptyState from "../components/EmptyState";
import EventListPanel from "../components/EventListPanel";
import EventMap from "../components/EventMap";
import EventPreviewCard from "../components/EventPreviewCard";
import FilterPanel from "../components/FilterPanel";
import MobileEventListSheet from "../components/MobileEventListSheet";
import MobileCategoryChips from "../components/MobileCategoryChips";
import CategoryExplorePanel from "../components/CategoryExplorePanel";
import SearchBar from "../components/SearchBar";
import { getCurrentSession, signOutUser } from "../services/authService";
import { getApprovedEvents } from "../services/eventService";
import { geocodeAddress } from "../services/geocodingService";
import { addDistanceFromPoint, filterEvents } from "../utils/eventUtils";
import { categoryHasExplorePanel, matchesEventSubcategory } from "../utils/categoryTaxonomyUtils";

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
  if (filters.startDate || filters.endDate) {
    if (filters.startDate && filters.endDate) {
      return {
        label: "Custom range",
        description: `${filters.startDate} to ${filters.endDate}`,
      };
    }

    if (filters.startDate) {
      return {
        label: "From date",
        description: `Events from ${filters.startDate}`,
      };
    }

    return {
      label: "Until date",
      description: `Events until ${filters.endDate}`,
    };
  }

  return TIME_FILTER_SUMMARIES[filters.timeRange] ?? null;
}

function getSavedEventsStorageKey(authSession) {
  const userId = authSession?.user?.id || "guest";
  return `vancouver-event-map:saved-events:${userId}`;
}

function readSavedEventIds(authSession) {
  try {
    const rawValue = window.localStorage.getItem(
      getSavedEventsStorageKey(authSession)
    );

    const parsedValue = JSON.parse(rawValue || "[]");

    return Array.isArray(parsedValue) ? parsedValue.map(String) : [];
  } catch (error) {
    console.error("Could not read saved events:", error);
    return [];
  }
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
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [isCategoryExplorePanelOpen, setIsCategoryExplorePanelOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedLocationGroup, setSelectedLocationGroup] = useState(null);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isEventListPanelOpen, setIsEventListPanelOpen] = useState(true);
  const [filters, setFilters] = useState({
    timeRange: "30d",
    startDate: "",
    endDate: "",
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
  const [savedEventIds, setSavedEventIds] = useState([]);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function locateUserOnFirstLoad() {
      try {
        setIsLocating(true);

        const location = await getCurrentPositionAsync();

        if (!isMounted) return;

        setUserLocation(location);
      } catch (error) {
        // Quiet fallback: if the user denies location or the browser cannot locate them,
        // EventMap keeps the default Greater Vancouver 3D camera.
        console.info("Using default Greater Vancouver map center:", error);
      } finally {
        if (isMounted) {
          setIsLocating(false);
        }
      }
    }

    locateUserOnFirstLoad();

    return () => {
      isMounted = false;
    };
  }, []);

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

  useEffect(() => {
    function refreshSavedEventIds() {
      setSavedEventIds(readSavedEventIds(authSession));
    }

    refreshSavedEventIds();

    window.addEventListener("saved-events-updated", refreshSavedEventIds);
    window.addEventListener("storage", refreshSavedEventIds);

    return () => {
      window.removeEventListener("saved-events-updated", refreshSavedEventIds);
      window.removeEventListener("storage", refreshSavedEventIds);
    };
  }, [authSession?.user?.id]);

  const eventSearchQuery = destinationLocation ? "" : query;

  const filteredEvents = useMemo(() => {
    return filterEvents(events, selectedCategory, eventSearchQuery, filters);
  }, [events, selectedCategory, eventSearchQuery, filters]);

  const subcategoryFilteredEvents = useMemo(() => {
    return filteredEvents.filter((event) =>
      matchesEventSubcategory(event, selectedCategory, selectedSubcategory)
    );
  }, [filteredEvents, selectedCategory, selectedSubcategory]);

  const displayedEvents = useMemo(() => {
    return addDistanceFromPoint(subcategoryFilteredEvents, destinationLocation);
  }, [subcategoryFilteredEvents, destinationLocation]);

  const savedEvents = useMemo(() => {
    if (!authSession?.user || savedEventIds.length === 0) {
      return [];
    }

    const savedIdSet = new Set(savedEventIds.map(String));

    return events.filter((event) => savedIdSet.has(String(event.id)));
  }, [authSession?.user, savedEventIds, events]);

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
  }, [selectedCategory, selectedSubcategory, query, filters]);

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

  function handleSelectCategory(categoryId) {
    setSelectedCategory(categoryId);
    setSelectedSubcategory("all");

    if (!categoryHasExplorePanel(categoryId)) {
      setIsCategoryExplorePanelOpen(false);
      return;
    }

    setIsCategoryExplorePanelOpen((isOpen) =>
      selectedCategory === categoryId ? !isOpen : true
    );
  }

  function handleSelectSubcategory(genreId) {
    setSelectedSubcategory(genreId);
    setSelectedLocationGroup(null);
    setNearestEvent(null);
    setNearestError("");
  }

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

  function handleSelectAddressSuggestion(suggestion) {
    setQuery(suggestion.label);
    setDestinationLocation(suggestion);
    setLocationSearchError("");
    setSelectedLocationGroup(null);
    setNearestEvent(null);
    setNearestError("");
    setSelectedEvent(null);
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
        subcategoryFilteredEvents,
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

  function handleThisWeekend() {
    const today = new Date();
    const dow = today.getDay(); // 0=Sun, 6=Sat, 5=Fri
    const startDate = new Date(today);
    const endDate = new Date(today);

    if (dow === 0) {
      // Sunday — just today
    } else if (dow === 6) {
      // Saturday — Sat + Sun
      endDate.setDate(today.getDate() + 1);
    } else if (dow === 5) {
      // Friday — Fri through Sun
      endDate.setDate(today.getDate() + 2);
    } else {
      // Mon–Thu — next Fri through Sun
      const daysToFri = 5 - dow;
      startDate.setDate(today.getDate() + daysToFri);
      endDate.setDate(today.getDate() + daysToFri + 2);
    }

    const toISO = (d) => d.toISOString().split("T")[0];
    setFilters({ timeRange: "", startDate: toISO(startDate), endDate: toISO(endDate) });
  }

  function handleResetFilters() {
    setFilters({
      timeRange: "30d",
      startDate: "",
      endDate: "",
    });

    setNearestEvent(null);
    setNearestError("");
  }

  const activeFilterSummary = getActiveFilterSummary(filters);

  const isWeekendFilter =
    filters.startDate && filters.endDate && !filters.timeRange;

  const contextLabel =
    filters.timeRange === "24h"
      ? "Tonight"
      : isWeekendFilter
        ? "This Weekend"
        : selectedCategory === "free"
          ? "Free Events"
          : "Vancouver";

  const freeCount = displayedEvents.filter(
    (e) => e.isFree || e.category === "free"
  ).length;

  const referencePoint = userLocation || destinationLocation;
  const nearCount = referencePoint
    ? displayedEvents.filter(
        (e) => typeof e.distanceKm === "number" && e.distanceKm <= 5
      ).length
    : 0;

  const quickChips = [
    {
      label: "Tonight",
      active: filters.timeRange === "24h" && !filters.startDate,
      onSelect: () =>
        filters.timeRange === "24h" && !filters.startDate
          ? setFilters({ timeRange: "30d", startDate: "", endDate: "" })
          : setFilters({ timeRange: "24h", startDate: "", endDate: "" }),
    },
    {
      label: "This Weekend",
      active: Boolean(isWeekendFilter),
      onSelect: () =>
        isWeekendFilter
          ? setFilters({ timeRange: "30d", startDate: "", endDate: "" })
          : handleThisWeekend(),
    },
    {
      label: "Free",
      active: selectedCategory === "free",
      onSelect: () =>
        handleSelectCategory(selectedCategory === "free" ? "all" : "free"),
    },
    {
      label: "Near Me",
      active: Boolean(nearestEvent),
      onSelect: () => {
        if (nearestEvent) {
          setNearestEvent(null);
          setNearestError("");
          setSelectedEvent(null);
        } else {
          handleFindNearestEvent();
        }
      },
    },
  ];

  useEffect(() => {
    if (!isCategoryExplorePanelOpen) {
      return;
    }

    function isInsideCategoryExploreUi(target) {
      return Boolean(
        target instanceof Element &&
          target.closest("[data-category-explore-panel], [data-category-explore-toggle]")
      );
    }

    function handlePointerDown(event) {
      if (isInsideCategoryExploreUi(event.target)) {
        return;
      }

      setIsCategoryExplorePanelOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isCategoryExplorePanelOpen]);

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
        onMapBackgroundClick={handleMapBackgroundClick}
        userLocation={userLocation}
        destinationLocation={destinationLocation}
        onLocate={handleUseCurrentLocation}
        isLocating={isLocating}
      />

      {/* Error toasts — right side, clear of controls */}
      {(authError || locationError) && (
        <div className="absolute right-4 top-[10rem] z-[25] flex flex-col items-end gap-2 lg:top-[16rem]">
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
      )}

      {!isLoadingEvents && displayedEvents.length === 0 && <EmptyState />}

      <header className="pointer-events-none absolute inset-x-0 top-0 z-50">
        <div className="pointer-events-auto relative w-full">
          <TopNavigation
            selectedCategory={selectedCategory}
            onSelectCategory={handleSelectCategory}
            authSession={authSession}
            isCheckingUserSession={isCheckingUserSession}
            isAccountMenuOpen={isAccountMenuOpen}
            onToggleAccountMenu={() =>
              setIsAccountMenuOpen((isOpen) => !isOpen)
            }
            onSignOut={handleUserSignOut}
            savedEventsCount={savedEvents.length}
            userInitial={getUserInitial()}
          />

          {categoryHasExplorePanel(selectedCategory) && isCategoryExplorePanelOpen && (
            <div className="absolute left-0 right-0 top-12 z-40 lg:top-16">
              <CategoryExplorePanel
                selectedCategory={selectedCategory}
                selectedSubcategory={selectedSubcategory}
                onSelectSubcategory={handleSelectSubcategory}
                onClose={() => setIsCategoryExplorePanelOpen(false)}
                avoidLeftPanel={isEventListPanelOpen}
              />
            </div>
          )}

          {/* Search bar: full width on mobile, fixed width left-aligned on desktop */}
          <div className="mt-3 px-4 lg:mx-0 lg:ml-5 lg:w-[396px] lg:px-0">
            <SearchBar
              query={query}
              onQueryChange={handleQueryChange}
              onFilterClick={() => setIsFilterOpen((isOpen) => !isOpen)}
              onSearchSubmit={handleSearchLocation}
              onSelectSuggestion={handleSelectAddressSuggestion}
              isSearchingLocation={isSearchingLocation}
              activeFilterSummary={activeFilterSummary}
            />
          </div>

          {/* Mobile-only chips (desktop chips live inside EventListPanel) */}
          <div className="lg:hidden">
            <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-4">
              {quickChips.map(({ label, active, onSelect }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onSelect}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                    active
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white/90 text-slate-600 hover:border-slate-400 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-4 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{contextLabel}</span>
              <span>·</span>
              <span>{displayedEvents.length} event{displayedEvents.length !== 1 ? "s" : ""}</span>
              {freeCount > 0 && <><span>·</span><span>{freeCount} free</span></>}
              {nearCount > 0 && <><span>·</span><span>{nearCount} near you</span></>}
            </div>
          </div>

          {/* Mobile category chips */}
          <div className="lg:hidden">
            <MobileCategoryChips
              selectedCategory={selectedCategory}
              onSelectCategory={handleSelectCategory}
            />
          </div>

          {(destinationLocation || locationSearchError) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 px-4 lg:px-0 lg:ml-5">
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
            <div className="pointer-events-none fixed left-1/2 top-48 z-50 -translate-x-1/2 lg:top-[8.5rem]">
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
        quickChips={quickChips}
        contextLabel={contextLabel}
        eventCount={displayedEvents.length}
        freeCount={freeCount}
        nearCount={nearCount}
        authSession={authSession}
      />

      <MobileEventListSheet
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
        isHidden={Boolean(selectedEvent)}
        authSession={authSession}
      />

      {selectedEvent && (
        <EventPreviewCard
          event={selectedEvent}
          authSession={authSession}
          onClose={handleClearMapSelection}
        />
      )}

      <FilterPanel
        isOpen={isFilterOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setIsFilterOpen(false)}
      />
    </main>
  );
}
