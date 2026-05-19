const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

const MAPBOX_GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";
const MAPBOX_BBOX = "-123.35,49.0,-122.55,49.38";

export async function fetchAddressSuggestions(query) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  if (!token || !query || query.trim().length < 2) {
    return [];
  }

  try {
    const encoded = encodeURIComponent(query.trim());
    const url =
      `${MAPBOX_GEOCODE_URL}/${encoded}.json` +
      `?access_token=${token}` +
      `&country=CA` +
      `&bbox=${MAPBOX_BBOX}` +
      `&limit=5` +
      `&types=address,place,locality,neighborhood,poi`;

    const response = await fetch(url);

    if (!response.ok) return [];

    const data = await response.json();

    return (data.features || []).map((feature) => ({
      id: feature.id,
      label: feature.place_name,
      shortLabel: feature.text || feature.place_name.split(",")[0].trim(),
      lat: feature.center[1],
      lng: feature.center[0],
    }));
  } catch {
    return [];
  }
}

// Bias results toward Greater Vancouver.
// Format: left,top,right,bottom = minLng,maxLat,maxLng,minLat
const GREATER_VANCOUVER_VIEWBOX = "-123.35,49.38,-122.55,49.0";

function getShortLocationLabel(displayName) {
  if (!displayName) return "Selected location";

  return displayName
    .split(",")
    .slice(0, 3)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

export async function geocodeAddress(query) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return null;
  }

  const params = new URLSearchParams({
    q: trimmedQuery,
    format: "jsonv2",
    addressdetails: "1",
    limit: "1",
    countrycodes: "ca",
    viewbox: GREATER_VANCOUVER_VIEWBOX,
    bounded: "0",
  });

  const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Location search failed: ${response.status}`);
  }

  const results = await response.json();
  const firstResult = results?.[0];

  if (!firstResult) {
    return null;
  }

  const lat = Number(firstResult.lat);
  const lng = Number(firstResult.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    lat,
    lng,
    label: firstResult.display_name,
    shortLabel: getShortLocationLabel(firstResult.display_name),
  };
}