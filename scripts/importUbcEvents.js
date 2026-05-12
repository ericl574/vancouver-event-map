import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL in .env.local");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SOURCE_NAME = "ubc_events";
const UBC_EVENTS_API_URL = "https://events.ubc.ca/wp-json/tribe/events/v1/events";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/147 Safari/537.36";

const PER_PAGE = Number(process.env.UBC_EVENTS_PER_PAGE || 50);
const MAX_PAGES = Number(process.env.UBC_EVENTS_MAX_PAGES || 3);
const IMPORT_DAYS_AHEAD = Number(process.env.UBC_EVENTS_DAYS_AHEAD || 90);
const DRY_RUN = process.argv.includes("--dry-run");

function toDateTimeText(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function getImportWindow() {
  const start = new Date();
  const end = new Date();

  end.setDate(end.getDate() + IMPORT_DAYS_AHEAD);

  return {
    startsAfter: toDateTimeText(start),
    startsBefore: toDateTimeText(end),
  };
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"');
}

function stripHtml(value) {
  return decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value, maxLength) {
  const text = String(value || "").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function getImageUrl(event) {
  if (!event.image) {
    return null;
  }

  return (
    event.image?.sizes?.medium?.url ||
    event.image?.sizes?.medium_large?.url ||
    event.image?.url ||
    null
  );
}

function getVenueText(event) {
  const venue = event.venue || null;

  if (!venue) {
    return "";
  }

  return [
    venue.venue,
    venue.address,
    venue.city,
    venue.province,
    venue.country,
    venue.zip,
  ]
    .map(decodeHtmlEntities)
    .filter(Boolean)
    .join(", ");
}

function getOrganizerNames(event) {
  if (!Array.isArray(event.organizer)) {
    return [];
  }

  return event.organizer
    .map((organizer) => decodeHtmlEntities(organizer.organizer))
    .filter(Boolean);
}

function getCategoryNames(event) {
  if (!Array.isArray(event.categories)) {
    return [];
  }

  return event.categories
    .map((category) => decodeHtmlEntities(category.name))
    .filter(Boolean);
}

function mapUbcEventToRawEvent(event) {
  const description = stripHtml(event.description);
  const venue = event.venue || null;

  const compactRawJson = {
    id: event.id,
    title: decodeHtmlEntities(event.title),
    url: event.url || null,
    website: event.website || null,
    start_date: event.start_date || null,
    end_date: event.end_date || null,
    timezone: event.timezone || null,
    cost: decodeHtmlEntities(event.cost),
    image_url: getImageUrl(event),
    venue: venue
      ? {
          id: venue.id || null,
          venue: decodeHtmlEntities(venue.venue),
          url: venue.url || null,
          address: decodeHtmlEntities(venue.address),
          city: decodeHtmlEntities(venue.city),
          province: decodeHtmlEntities(venue.province),
          country: decodeHtmlEntities(venue.country),
          zip: decodeHtmlEntities(venue.zip),
        }
      : null,
    organizers: getOrganizerNames(event),
    categories: getCategoryNames(event),
  };

  return {
    source_name: SOURCE_NAME,
    source_url: event.url || null,
    external_id: event.id ? String(event.id) : null,
    raw_title: decodeHtmlEntities(event.title) || null,
    raw_description: truncate(description, 1500) || null,
    raw_date_text: event.start_date || null,
    raw_location_text: getVenueText(event) || null,
    raw_price_text: decodeHtmlEntities(event.cost) || null,
    raw_image_url: getImageUrl(event),
    raw_ticket_url: event.website || event.url || null,
    raw_json: compactRawJson,
    import_status: "new",
    error_message: null,
  };
}

async function fetchUbcEventsPage(page) {
  const { startsAfter, startsBefore } = getImportWindow();
  const url = new URL(UBC_EVENTS_API_URL);

  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("page", String(page));
  url.searchParams.set("starts_after", startsAfter);
  url.searchParams.set("starts_before", startsBefore);

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `UBC Events request failed: ${response.status} ${response.statusText}\n${body.slice(
        0,
        1000
      )}`
    );
  }

  const data = await response.json();

  return {
    events: data.events || [],
    total: Number(response.headers.get("x-tec-total") || 0),
    totalPages: Number(response.headers.get("x-tec-totalpages") || 0),
  };
}

function dedupeRowsByExternalId(rows) {
  const rowMap = new Map();

  for (const row of rows) {
    if (!row.external_id) continue;

    rowMap.set(`${row.source_name}:${row.external_id}`, row);
  }

  return Array.from(rowMap.values());
}

async function importUbcEvents() {
  console.log("Starting UBC Events import...");
  console.log(`Mode: ${DRY_RUN ? "dry run" : "upsert"}`);
  console.log(`Import window: next ${IMPORT_DAYS_AHEAD} days`);
  console.log(`Page size: ${PER_PAGE}`);
  console.log(`Max pages: ${MAX_PAGES}`);

  let totalFetched = 0;
  let totalSaved = 0;
  let latestTotal = 0;
  let latestTotalPages = 0;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { events, total, totalPages } = await fetchUbcEventsPage(page);

    latestTotal = total;
    latestTotalPages = totalPages;

    if (events.length === 0) {
      console.log(`No events found on page ${page}. Stopping.`);
      break;
    }

    totalFetched += events.length;

    const rows = dedupeRowsByExternalId(
      events
        .map(mapUbcEventToRawEvent)
        .filter((row) => row.source_url && row.external_id)
    );

    if (!DRY_RUN && rows.length > 0) {
      const { error } = await supabase.from("raw_events").upsert(rows, {
        onConflict: "source_name,external_id",
      });

      if (error) {
        throw error;
      }
    }

    totalSaved += rows.length;

    console.log(
      `Page ${page}/${totalPages}: fetched ${events.length}, ${
        DRY_RUN ? "would queue" : "queued/refreshed"
      } ${rows.length}`
    );

    if (page >= totalPages) {
      break;
    }
  }

  console.log("UBC Events import complete.");
  console.log(`API total matching window: ${latestTotal}`);
  console.log(`API total pages: ${latestTotalPages}`);
  console.log(`Fetched: ${totalFetched}`);
  console.log(`${DRY_RUN ? "Would queue" : "Queued/refreshed"} in raw_events: ${totalSaved}`);
}

importUbcEvents().catch((error) => {
  console.error("UBC Events import failed:");
  console.error(error);
  process.exit(1);
});
