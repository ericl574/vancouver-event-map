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

const SOURCE_NAME = "blueprint";
const BLUEPRINT_EVENTS_URL = "https://www.thisisblueprint.com/events";
const IMPORT_DAYS_AHEAD = Number(process.env.BLUEPRINT_EVENTS_DAYS_AHEAD || 365);
const DRY_RUN = process.argv.includes("--dry-run");

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/147 Safari/537.36";

function cleanText(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMarkdown(value) {
  return cleanText(value)
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .trim();
}

function truncate(value, maxLength) {
  const text = String(value || "").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function getEventPageUrl(event) {
  if (!event.handle) {
    return null;
  }

  return `https://www.thisisblueprint.com/events/${event.handle}`;
}

function getImageUrl(event) {
  return (
    event.card_image_attachment?.do?.Location ||
    event.landing_page_image_attachment?.do?.Location ||
    event.card_image_attachment?.air?.url ||
    event.landing_page_image_attachment?.air?.url ||
    null
  );
}

function getExternalId(event) {
  return String(event.unique_id || event.airtable_id || event.id || event.handle || "");
}

function getRawLocationText(event) {
  return [event.location_name, event.venue_address]
    .map(cleanText)
    .filter(Boolean)
    .join(", ");
}

function isWithinImportWindow(event) {
  if (!event.date) {
    return false;
  }

  const eventDate = new Date(`${event.date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + IMPORT_DAYS_AHEAD);

  return eventDate >= today && eventDate <= maxDate;
}

function isVancouverEvent(event) {
  return String(event.city || "").toUpperCase() === "VAN";
}

function isLiveEvent(event) {
  return String(event.tib_com_status || "").toUpperCase() === "LIVE";
}

function mapBlueprintEventToRawEvent(event) {
  const sourceUrl = getEventPageUrl(event);
  const externalId = getExternalId(event);
  const imageUrl = getImageUrl(event);

  const compactRawJson = {
    id: event.id || null,
    name: cleanText(event.name),
    handle: event.handle || null,
    unique_id: event.unique_id || null,
    airtable_id: event.airtable_id || null,
    description: truncate(stripMarkdown(event.description), 1500),
    date: event.date || null,
    location_name: cleanText(event.location_name),
    venue_address: cleanText(event.venue_address),
    city: cleanText(event.city),
    genre: cleanText(event.genre),
    genre_search: cleanText(event.genre_search),
    ticket_link: event.ticket_link || null,
    image_url: imageUrl,
    status: event.tib_com_status || null,
    live: event.live || null,
    event_dnu: event.event_dnu || null,
  };

  return {
    source_name: SOURCE_NAME,
    source_url: sourceUrl,
    external_id: externalId,
    raw_title: cleanText(event.name) || null,
    raw_description: truncate(stripMarkdown(event.description), 1500) || null,
    raw_date_text: event.date || null,
    raw_location_text: getRawLocationText(event) || null,
    raw_price_text: null,
    raw_image_url: imageUrl,
    raw_ticket_url: event.ticket_link || sourceUrl,
    raw_json: compactRawJson,
    import_status: "new",
    error_message: null,
  };
}

async function fetchBlueprintEvents() {
  const response = await fetch(BLUEPRINT_EVENTS_URL, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Blueprint request failed: ${response.status} ${response.statusText}\n${body.slice(
        0,
        1000
      )}`
    );
  }

  const html = await response.text();
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );

  if (!match) {
    throw new Error("Could not find Blueprint __NEXT_DATA__ script.");
  }

  const data = JSON.parse(match[1]);
  const events = data?.props?.pageProps?.allEvents;

  if (!Array.isArray(events)) {
    throw new Error("Could not find Blueprint allEvents array.");
  }

  return events;
}

function dedupeRowsByExternalId(rows) {
  const rowMap = new Map();

  for (const row of rows) {
    if (!row.external_id || !row.source_url) continue;

    rowMap.set(`${row.source_name}:${row.external_id}`, row);
  }

  return Array.from(rowMap.values());
}

async function importBlueprintEvents() {
  console.log("Starting Blueprint import...");
  console.log(`Mode: ${DRY_RUN ? "dry run" : "upsert"}`);
  console.log(`Import window: next ${IMPORT_DAYS_AHEAD} days`);

  const events = await fetchBlueprintEvents();

  const liveVancouverEvents = events.filter(
    (event) => isLiveEvent(event) && isVancouverEvent(event) && isWithinImportWindow(event)
  );

  const rows = dedupeRowsByExternalId(
    liveVancouverEvents
      .map(mapBlueprintEventToRawEvent)
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

  console.log("Blueprint import complete.");
  console.log(`Fetched from page: ${events.length}`);
  console.log(`Live Vancouver events in window: ${liveVancouverEvents.length}`);
  console.log(`${DRY_RUN ? "Would queue" : "Queued/refreshed"} in raw_events: ${rows.length}`);

  console.log("Sample:");
  for (const row of rows.slice(0, 8)) {
    console.log(`- ${row.raw_date_text}: ${row.raw_title} @ ${row.raw_location_text}`);
  }
}

importBlueprintEvents().catch((error) => {
  console.error("Blueprint import failed:");
  console.error(error);
  process.exit(1);
});
