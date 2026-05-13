import { useEffect, useMemo, useState } from "react";
import EventCard from "../components/EventCard";
import EventPreviewCard from "../components/EventPreviewCard";
import { getCurrentSession } from "../services/authService";
import { getApprovedEvents } from "../services/eventService";

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

export default function FavoritesPage() {
  const [authSession, setAuthSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [savedEventIds, setSavedEventIds] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadFavoritesPage() {
      try {
        setIsLoading(true);
        setPageError("");

        const session = await getCurrentSession();

        if (!isMounted) return;

        setAuthSession(session);

        if (!session?.user) {
          setPageError("Please log in to view your favorite events.");
          setEvents([]);
          setSavedEventIds([]);
          return;
        }

        const approvedEvents = await getApprovedEvents();

        if (!isMounted) return;

        const savedIds = readSavedEventIds(session);

        setEvents(approvedEvents);
        setSavedEventIds(savedIds);

        const savedIdSet = new Set(savedIds);
        const firstSavedEvent = approvedEvents.find((event) =>
          savedIdSet.has(String(event.id))
        );

        setSelectedEvent(firstSavedEvent ?? null);
      } catch (error) {
        console.error("Could not load favorite events:", error);

        if (!isMounted) return;

        setPageError("Could not load your favorite events.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadFavoritesPage();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function refreshSavedEvents() {
      setSavedEventIds(readSavedEventIds(authSession));
    }

    window.addEventListener("saved-events-updated", refreshSavedEvents);
    window.addEventListener("storage", refreshSavedEvents);

    return () => {
      window.removeEventListener("saved-events-updated", refreshSavedEvents);
      window.removeEventListener("storage", refreshSavedEvents);
    };
  }, [authSession?.user?.id]);

  const savedEvents = useMemo(() => {
    const savedIdSet = new Set(savedEventIds.map(String));

    return events.filter((event) => savedIdSet.has(String(event.id)));
  }, [events, savedEventIds]);

  const filteredSavedEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return savedEvents;
    }

    return savedEvents.filter((event) =>
      [
        event.title,
        event.venue,
        event.area,
        event.category,
        event.description,
        ...(event.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [savedEvents, query]);

  useEffect(() => {
    if (!selectedEvent) return;

    const selectedStillSaved = filteredSavedEvents.some(
      (event) => String(event.id) === String(selectedEvent.id)
    );

    if (!selectedStillSaved) {
      setSelectedEvent(filteredSavedEvents[0] ?? null);
    }
  }, [filteredSavedEvents, selectedEvent?.id]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a
              href="/"
              className="text-sm font-bold text-pink-600 transition hover:text-pink-700"
            >
              ← Back to map
            </a>

            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Favorite List
            </h1>

            <p className="mt-1 text-sm font-medium text-slate-500">
              {savedEvents.length} saved event
              {savedEvents.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-600 shadow-lg shadow-slate-900/5">
            {authSession?.user?.email || "Not logged in"}
          </div>
        </div>

        <div className="mb-5 rounded-[2rem] border border-white/80 bg-white/90 p-3 shadow-xl shadow-slate-900/5 backdrop-blur">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your favorite events..."
            className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-100"
          />
        </div>

        {isLoading && (
          <div className="rounded-[2rem] bg-white/90 p-6 text-center font-semibold text-slate-600 shadow-xl shadow-slate-900/5">
            Loading favorite events...
          </div>
        )}

        {!isLoading && pageError && (
          <div className="rounded-[2rem] bg-white/90 p-6 text-center shadow-xl shadow-slate-900/5">
            <p className="font-semibold text-red-600">{pageError}</p>
            <a
              href="/login"
              className="mt-4 inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-pink-600"
            >
              Log in
            </a>
          </div>
        )}

        {!isLoading && !pageError && savedEvents.length === 0 && (
          <div className="rounded-[2rem] bg-white/90 p-8 text-center shadow-xl shadow-slate-900/5">
            <p className="text-lg font-black text-slate-900">
              No favorite events yet.
            </p>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Save events from the map, then they will appear here.
            </p>
            <a
              href="/"
              className="mt-5 inline-flex rounded-full bg-pink-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-pink-600"
            >
              Explore events
            </a>
          </div>
        )}

        {!isLoading && !pageError && savedEvents.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
            <section className="rounded-[2rem] border border-white/80 bg-white/90 p-4 shadow-xl shadow-slate-900/5 backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-black">Saved events</h2>
                <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-600">
                  {filteredSavedEvents.length}
                </span>
              </div>

              {filteredSavedEvents.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-500">
                  No saved events match your search.
                </p>
              ) : (
                <div className="no-scrollbar max-h-[calc(100vh-15rem)] space-y-3 overflow-y-auto pr-1">
                  {filteredSavedEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isSelected={String(selectedEvent?.id) === String(event.id)}
                      onClick={setSelectedEvent}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="relative min-h-[520px] rounded-[2rem] border border-white/80 bg-white/60 p-4 shadow-xl shadow-slate-900/5 backdrop-blur">
              {selectedEvent ? (
                <div className="relative min-h-[520px]">
                  <EventPreviewCard
                    event={selectedEvent}
                    authSession={authSession}
                    variant="detail"
                  />
                </div>
              ) : (
                <div className="flex min-h-[520px] items-center justify-center text-center">
                  <div>
                    <p className="text-lg font-black text-slate-900">
                      Select an event
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      Choose a favorite event from the list to preview it.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
