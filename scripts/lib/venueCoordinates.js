function normalizeVenueName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Manual coordinates for high-confidence UBC / Vancouver venues.
// These are intentionally limited. Unknown venues should not be guessed onto the map.
const VENUE_COORDINATES_BY_ID = {
  // UBC Vancouver campus
  "36266": {
    name: "UBC Farm",
    lat: 49.2506,
    lng: -123.2377,
  },
  "36175": {
    name: "Irving K. Barber Learning Centre",
    lat: 49.2676,
    lng: -123.2524,
  },
  "36259": {
    name: "Robert H. Lee Alumni Centre",
    lat: 49.2657,
    lng: -123.2494,
  },
  "36101": {
    name: "Allard Hall",
    lat: 49.2698,
    lng: -123.2537,
  },
  "36105": {
    name: "Aquatic Ecosystems Research Laboratory (AERL)",
    lat: 49.2636,
    lng: -123.2532,
  },
  "36128": {
    name: "Civil and Mechanical Engineering Building (CEME)",
    lat: 49.2622,
    lng: -123.2488,
  },
  "78775": {
    name: "Gateway Health Building",
    lat: 49.2638,
    lng: -123.2469,
  },
  "36164": {
    name: "Green College",
    lat: 49.2714,
    lng: -123.2564,
  },
  "36109": {
    name: "Old Auditorium",
    lat: 49.2664,
    lng: -123.2564,
  },
  "36115": {
    name: "UBC Bookstore",
    lat: 49.2666,
    lng: -123.2508,
  },
  "36272": {
    name: "Walter C. Koerner Library",
    lat: 49.2674,
    lng: -123.2551,
  },

  // Vancouver off-campus UBC-related venues
  "36269": {
    name: "UBC Robson Square",
    lat: 49.2828,
    lng: -123.1211,
  },
  "79166": {
    name: "BC Children's Hospital Research Institute",
    lat: 49.2457,
    lng: -123.1243,
  },
};

const VENUE_COORDINATES_BY_NAME = Object.fromEntries(
  Object.values(VENUE_COORDINATES_BY_ID).map((venue) => [
    normalizeVenueName(venue.name),
    venue,
  ])
);

export function getVenueCoordinates(venue) {
  if (!venue) {
    return null;
  }

  const byId = VENUE_COORDINATES_BY_ID[String(venue.id || "")];

  if (byId) {
    return byId;
  }

  const byName = VENUE_COORDINATES_BY_NAME[normalizeVenueName(venue.venue)];

  return byName || null;
}

export function isUnsupportedMapVenue(venue) {
  const venueName = normalizeVenueName(venue?.venue);

  if (!venueName) {
    return "Missing UBC venue";
  }

  if (venueName.includes("online") || venueName.includes("virtual")) {
    return "Online/virtual UBC event is not map-ready";
  }

  if (venueName.includes("see description")) {
    return "UBC venue requires manual location review";
  }

  return null;
}
