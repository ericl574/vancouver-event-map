import React, { useMemo, useState } from "react";

// Vancouver Event Map Main Interface
// Fix applied: this version removes the external `lucide-react` dependency.
// The previous build failed because icon files could not be fetched from the CDN.
// All icons below are local inline SVG React components, so the prototype can run offline.

function IconSearch({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconLocate({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconCalendarPlus({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <path d="M12 14v5" />
      <path d="M9.5 16.5h5" />
    </svg>
  );
}

function IconShare({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4" />
      <path d="m15.4 6.5-6.8 4" />
    </svg>
  );
}

function IconBookmark({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21 12 17 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconSliders({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 21v-7" />
      <path d="M4 10V3" />
      <path d="M12 21v-9" />
      <path d="M12 8V3" />
      <path d="M20 21v-5" />
      <path d="M20 12V3" />
      <path d="M2 14h4" />
      <path d="M10 8h4" />
      <path d="M18 16h4" />
    </svg>
  );
}

function IconX({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

const CATEGORIES = [
  { id: "music", label: "Music", color: "bg-blue-500" },
  { id: "festival", label: "Festival", color: "bg-pink-500" },
  { id: "comedy", label: "Comedy", color: "bg-yellow-500" },
  { id: "art", label: "Art", color: "bg-purple-500" },
  { id: "food", label: "Food", color: "bg-orange-500" },
  { id: "workshop", label: "Workshop", color: "bg-green-500" },
  { id: "career", label: "Career", color: "bg-cyan-500" },
  { id: "student", label: "Student", color: "bg-indigo-500" },
  { id: "nightlife", label: "Nightlife", color: "bg-red-500" },
  { id: "free", label: "Free", color: "bg-emerald-500" },
];

const EVENTS = [
  {
    id: 1,
    title: "Indie Live Night",
    category: "music",
    venue: "Commodore Ballroom",
    area: "Downtown",
    date: "Tonight",
    time: "8:00 PM",
    price: "$28",
    distance: "1.2 km",
    description: "A local indie music showcase featuring Vancouver artists.",
    x: "50%",
    y: "47%",
  },
  {
    id: 2,
    title: "Weekend Art Market",
    category: "art",
    venue: "Granville Island",
    area: "Granville Island",
    date: "Sat",
    time: "11:00 AM",
    price: "Free",
    distance: "2.6 km",
    description: "Local artists, handmade crafts, prints, and design booths.",
    x: "43%",
    y: "57%",
  },
  {
    id: 3,
    title: "Tech Career Mixer",
    category: "career",
    venue: "UBC Robson Square",
    area: "Downtown",
    date: "Fri",
    time: "6:30 PM",
    price: "Free",
    distance: "0.8 km",
    description: "Networking event for students and early-career tech workers.",
    x: "54%",
    y: "43%",
  },
  {
    id: 4,
    title: "Food Truck Festival",
    category: "food",
    venue: "Olympic Village",
    area: "False Creek",
    date: "Sun",
    time: "12:00 PM",
    price: "Free entry",
    distance: "3.1 km",
    description: "A casual outdoor food festival with local vendors.",
    x: "55%",
    y: "60%",
  },
  {
    id: 5,
    title: "Student Board Game Night",
    category: "student",
    venue: "AMS Nest",
    area: "UBC",
    date: "Thu",
    time: "7:00 PM",
    price: "Free",
    distance: "9.4 km",
    description: "A relaxed student social event with board games and snacks.",
    x: "21%",
    y: "67%",
  },
];

function getCategory(categoryId) {
  return CATEGORIES.find((category) => category.id === categoryId) || CATEGORIES[0];
}

function filterEvents(events, selectedCategory, query) {
  const normalizedQuery = query.trim().toLowerCase();

  return events.filter((event) => {
    const matchesCategory = selectedCategory === "all" || event.category === selectedCategory;
    const searchable = `${event.title} ${event.venue} ${event.area} ${event.category}`.toLowerCase();
    const matchesQuery = normalizedQuery === "" || searchable.includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });
}

function runDevTests() {
  // Lightweight sanity tests for the filtering logic.
  // These do not replace a real test suite, but they help catch obvious regressions in this prototype.
  console.assert(filterEvents(EVENTS, "all", "").length === EVENTS.length, "Test failed: all events should be visible by default.");
  console.assert(filterEvents(EVENTS, "music", "").length === 1, "Test failed: music filter should return one event.");
  console.assert(filterEvents(EVENTS, "all", "ubc").length === 2, "Test failed: searching 'ubc' should match UBC Robson Square and AMS Nest.");
  console.assert(filterEvents(EVENTS, "food", "ubc").length === 0, "Test failed: combined category and query should narrow results.");
}

if (typeof window !== "undefined") {
  runDevTests();
}

function EmptyResults() {
  return (
    <div className="absolute left-1/2 top-1/2 z-30 w-[min(90vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white/95 p-5 text-center shadow-xl backdrop-blur">
      <h2 className="text-lg font-bold">No events found</h2>
      <p className="mt-1 text-sm text-slate-500">Try another category, search term, or date filter.</p>
    </div>
  );
}

export default function VancouverEventMapMain() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState(EVENTS[0]);
  const [query, setQuery] = useState("");

  const filteredEvents = useMemo(() => {
    const nextEvents = filterEvents(EVENTS, selectedCategory, query);

    if (selectedEvent && !nextEvents.some((event) => event.id === selectedEvent.id)) {
      setSelectedEvent(nextEvents[0] || null);
    }

    return nextEvents;
  }, [selectedCategory, query, selectedEvent]);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-slate-100 text-slate-900">
      {/* Fake map background for UI prototype. Replace this section with React Leaflet, Mapbox, or Google Maps later. */}
      <section className="absolute inset-0" aria-label="Vancouver event map prototype">
        <div className="relative h-full w-full bg-[linear-gradient(90deg,#dbeafe_1px,transparent_1px),linear-gradient(#dbeafe_1px,transparent_1px)] bg-[size:48px_48px]">
          <div className="absolute left-[8%] top-[18%] h-[70%] w-[72%] rounded-[45%] bg-blue-100/70 blur-sm" />
          <div className="absolute left-[34%] top-[10%] h-[78%] w-24 -rotate-12 rounded-full bg-slate-200/90" />
          <div className="absolute left-[48%] top-[0%] h-full w-20 rotate-6 rounded-full bg-slate-200/90" />
          <div className="absolute left-[0%] top-[52%] h-20 w-full -rotate-6 bg-slate-200/90" />
          <div className="absolute left-[62%] top-[28%] rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 shadow">Downtown</div>
          <div className="absolute left-[30%] top-[64%] rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 shadow">UBC / West Side</div>
          <div className="absolute left-[57%] top-[66%] rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 shadow">False Creek</div>

          {filteredEvents.map((event) => {
            const category = getCategory(event.category);
            const isSelected = selectedEvent?.id === event.id;
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedEvent(event)}
                className={`absolute z-20 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white shadow-lg transition hover:scale-110 focus:outline-none focus:ring-4 focus:ring-white/80 ${category.color} ${isSelected ? "scale-125 ring-4 ring-white/80" : ""}`}
                style={{ left: event.x, top: event.y }}
                aria-label={`Open ${event.title}`}
                title={event.title}
              >
                <span className="h-2 w-2 rounded-full bg-white" />
              </button>
            );
          })}
        </div>
      </section>

      {filteredEvents.length === 0 && <EmptyResults />}

      {/* Top search and filter layer */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 p-4">
        <div className="pointer-events-auto mx-auto max-w-5xl">
          <div className="flex items-center gap-2 rounded-2xl bg-white/95 p-2 shadow-xl backdrop-blur">
            <div className="flex flex-1 items-center gap-2 px-3">
              <IconSearch className="h-5 w-5 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search events, venues, neighborhoods..."
                className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                aria-label="Search events"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="rounded-full p-1 hover:bg-slate-100" aria-label="Clear search">
                  <IconX className="h-4 w-4 text-slate-500" />
                </button>
              )}
            </div>
            <button type="button" className="rounded-xl bg-slate-100 p-3 hover:bg-slate-200" aria-label="Open filters">
              <IconSliders className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Event categories">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium shadow-sm ${selectedCategory === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
            >
              All
            </button>
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-sm ${selectedCategory === category.id ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${category.color}`} />
                {category.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Floating location button */}
      <button type="button" className="absolute right-4 top-36 z-30 rounded-full bg-white p-3 shadow-lg hover:bg-slate-50" aria-label="Use current location">
        <IconLocate className="h-5 w-5 text-slate-700" />
      </button>

      {/* Desktop event list */}
      <aside className="absolute bottom-6 left-6 top-36 z-30 hidden w-80 rounded-3xl bg-white/95 p-4 shadow-xl backdrop-blur lg:block">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Events near Vancouver</h2>
            <p className="text-sm text-slate-500">{filteredEvents.length} events found</p>
          </div>
        </div>

        <div className="space-y-3 overflow-y-auto pr-1">
          {filteredEvents.map((event) => {
            const category = getCategory(event.category);
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedEvent(event)}
                className={`w-full rounded-2xl border p-3 text-left transition hover:bg-slate-50 ${selectedEvent?.id === event.id ? "border-slate-900" : "border-slate-200"}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${category.color}`} />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{category.label}</span>
                </div>
                <h3 className="font-semibold">{event.title}</h3>
                <p className="text-sm text-slate-500">{event.venue} · {event.area}</p>
                <p className="mt-1 text-sm font-medium">{event.date} · {event.time} · {event.price}</p>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Mobile and desktop selected event preview */}
      {selectedEvent && (
        <section className="absolute inset-x-0 bottom-0 z-40 rounded-t-3xl bg-white p-4 shadow-2xl lg:left-auto lg:right-6 lg:top-auto lg:w-96 lg:rounded-3xl">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 lg:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${getCategory(selectedEvent.category).color}`} />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {getCategory(selectedEvent.category).label}
                </span>
              </div>
              <h2 className="text-xl font-bold">{selectedEvent.title}</h2>
              <p className="text-sm text-slate-500">{selectedEvent.venue} · {selectedEvent.area}</p>
            </div>
            <button type="button" className="rounded-full border border-slate-200 p-2 hover:bg-slate-50" aria-label="Save event">
              <IconBookmark className="h-5 w-5" />
            </button>
          </div>

          <p className="mt-3 text-sm text-slate-600">{selectedEvent.description}</p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-2xl bg-slate-100 p-3">
              <p className="text-xs text-slate-500">Date</p>
              <p className="font-semibold">{selectedEvent.date}</p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3">
              <p className="text-xs text-slate-500">Time</p>
              <p className="font-semibold">{selectedEvent.time}</p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3">
              <p className="text-xs text-slate-500">Price</p>
              <p className="font-semibold">{selectedEvent.price}</p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button type="button" className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              View Details
            </button>
            <button type="button" className="rounded-2xl border border-slate-200 p-3 hover:bg-slate-50" aria-label="Add to calendar">
              <IconCalendarPlus className="h-5 w-5" />
            </button>
            <button type="button" className="rounded-2xl border border-slate-200 p-3 hover:bg-slate-50" aria-label="Share event">
              <IconShare className="h-5 w-5" />
            </button>
          </div>
        </section>
      )}
    </main>
  );
}


