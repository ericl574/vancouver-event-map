import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();
import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TICKETMASTER_API_KEY,
} = process.env;

if (!SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL in .env.local");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

if (!TICKETMASTER_API_KEY) {
  throw new Error("Missing TICKETMASTER_API_KEY in .env.local");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TICKETMASTER_BASE_URL =
  "https://app.ticketmaster.com/discovery/v2/events.json";

const VANCOUVER_TIME_ZONE = "America/Vancouver";
const SOURCE_NAME = "ticketmaster";
const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const IMPORT_DAYS_AHEAD = Number(process.env.TICKETMASTER_EVENTS_DAYS_AHEAD || 365);

function toTicketmasterDateTime(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function getImportWindow() {
  const start = new Date();
  const end = new Date();

  end.setDate(end.getDate() + IMPORT_DAYS_AHEAD);

  return {
    startDateTime: toTicketmasterDateTime(start),
    endDateTime: toTicketmasterDateTime(end),
  };
}

function getBestImageUrl(event) {
  if (!Array.isArray(event.images) || event.images.length === 0) {
    return null;
  }

  const sortedImages = [...event.images].sort((a, b) => {
    const aPixels = Number(a.width || 0) * Number(a.height || 0);
    const bPixels = Number(b.width || 0) * Number(b.height || 0);

    return bPixels - aPixels;
  });

  return sortedImages[0]?.url || null;
}

function getPrimaryVenue(event) {
  return event?._embedded?.venues?.[0] || null;
}

function getRawDateText(event) {
  const localDate = event?.dates?.start?.localDate || "";
  const localTime = event?.dates?.start?.localTime || "";

  return [localDate, localTime].filter(Boolean).join(" ");
}

function getRawLocationText(event) {
  const venue = getPrimaryVenue(event);

  if (!venue) return "";

  const parts = [
    venue.name,
    venue.address?.line1,
    venue.city?.name,
    venue.state?.stateCode,
    venue.country?.countryCode,
    venue.postalCode,
  ];

  return parts.filter(Boolean).join(", ");
}

function getRawPriceText(event) {
  if (event.priceRanges?.length > 0) {
    return event.priceRanges
      .map((price) => {
        const min = price.min != null ? price.min : "";
        const max = price.max != null ? price.max : "";
        const currency = price.currency || "";

        if (min !== "" && max !== "") {
          return `${currency} ${min}-${max}`;
        }

        if (min !== "") {
          return `${currency} ${min}+`;
        }

        return currency;
      })
      .filter(Boolean)
      .join("; ");
  }

  return "";
}

function mapTicketmasterEventToRawEvent(event) {
  return {
    source_name: SOURCE_NAME,
    source_url: event.url || null,
    external_id: event.id || null,
    raw_title: event.name || null,
    raw_description: event.info || event.pleaseNote || null,
    raw_date_text: getRawDateText(event),
    raw_location_text: getRawLocationText(event),
    raw_price_text: getRawPriceText(event),
    raw_image_url: getBestImageUrl(event),
    raw_ticket_url: event.url || null,
    raw_json: event,
    import_status: "new",
    error_message: null,
  };
}

function dedupeRowsBySourceUrl(rows) {
  const rowMap = new Map();

  for (const row of rows) {
    if (!row.source_url) continue;

    const key = `${row.source_name}:${row.source_url}`;
    rowMap.set(key, row);
  }

  return Array.from(rowMap.values());
}

async function fetchTicketmasterPage(page) {
  const { startDateTime, endDateTime } = getImportWindow();

  const url = new URL(TICKETMASTER_BASE_URL);

  url.searchParams.set("apikey", TICKETMASTER_API_KEY);
  url.searchParams.set("city", "Vancouver");
  url.searchParams.set("countryCode", "CA");
  url.searchParams.set("startDateTime", startDateTime);
  url.searchParams.set("endDateTime", endDateTime);
  url.searchParams.set("size", String(PAGE_SIZE));
  url.searchParams.set("page", String(page));
  url.searchParams.set("sort", "date,asc");
  url.searchParams.set("includeTBA", "no");
  url.searchParams.set("includeTBD", "no");

  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Ticketmaster request failed: ${response.status} ${response.statusText}\n${body}`
    );
  }

  return response.json();
}

async function importTicketmasterEvents() {
  console.log("Starting Ticketmaster import...");
  console.log(`Time zone reference: ${VANCOUVER_TIME_ZONE}`);
  console.log(`Fetching Vancouver events for the next ${IMPORT_DAYS_AHEAD} days...`);

  let totalFetched = 0;
  let totalSaved = 0;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await fetchTicketmasterPage(page);
    const events = data?._embedded?.events || [];
    const totalPages = data?.page?.totalPages ?? 0;

    if (events.length === 0) {
      console.log(`No events found on page ${page}. Stopping.`);
      break;
    }

    totalFetched += events.length;

    const rows = dedupeRowsBySourceUrl(
      events
        .map(mapTicketmasterEventToRawEvent)
        .filter((row) => row.source_url && row.external_id)
    );
      const { error } = await supabase
        .from("raw_events")
        .upsert(rows, {
          onConflict: "source_name,external_id",
        });

    if (error) {
      throw error;
    }

    totalSaved += rows.length;

    console.log(
      `Page ${page + 1}/${totalPages}: fetched ${events.length}, queued/refreshed ${rows.length}`
    );

    if (page + 1 >= totalPages) {
      break;
    }
  }

  console.log("Ticketmaster import complete.");
  console.log(`Fetched: ${totalFetched}`);
  console.log(`Queued/refreshed in raw_events: ${totalSaved}`);
}

importTicketmasterEvents().catch((error) => {
  console.error("Import failed:");
  console.error(error);
  process.exit(1);
});
