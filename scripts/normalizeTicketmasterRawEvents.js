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

const SOURCE_NAME = "ticketmaster";
const BATCH_LIMIT = 200;
const AUTO_APPROVE_MAX_DAYS_AHEAD = 180;

const GREATER_VANCOUVER_BOUNDS = {
  minLat: 49.0,
  maxLat: 49.5,
  minLng: -123.35,
  maxLng: -122.45,
};

function getPrimaryVenue(rawJson) {
  return rawJson?._embedded?.venues?.[0] || null;
}

function cleanText(value) {
  if (!value) return "";

  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function isInsideGreaterVancouver(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= GREATER_VANCOUVER_BOUNDS.minLat &&
    lat <= GREATER_VANCOUVER_BOUNDS.maxLat &&
    lng >= GREATER_VANCOUVER_BOUNDS.minLng &&
    lng <= GREATER_VANCOUVER_BOUNDS.maxLng
  );
}

function getAutoApprovalIssue(event) {
  if (!event.venue) {
    return "Missing venue";
  }

  if (!event.ticket_url && !event.source_url) {
    return "Missing ticket/source URL";
  }

  if (!isInsideGreaterVancouver(Number(event.lat), Number(event.lng))) {
    return "Outside Greater Vancouver bounds";
  }

  const eventDate = new Date(`${event.event_date}T${event.start_time || "00:00:00"}`);

  if (Number.isNaN(eventDate.getTime())) {
    return "Invalid event date";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (eventDate < today) {
    return "Event date is in the past";
  }

  const maxAutoApproveDate = new Date(today);
  maxAutoApproveDate.setDate(today.getDate() + AUTO_APPROVE_MAX_DAYS_AHEAD);

  if (eventDate > maxAutoApproveDate) {
    return "Event is too far in the future";
  }

  const text = `${event.title || ""} ${event.description || ""}`.toLowerCase();

  if (
    text.includes("cancelled") ||
    text.includes("canceled") ||
    text.includes("postponed")
  ) {
    return "Possibly cancelled or postponed";
  }

  return null;
}

function getTicketmasterClassifications(rawJson) {
  const classification = rawJson?.classifications?.[0] || {};

  return {
    segment: classification.segment?.name || "",
    genre: classification.genre?.name || "",
    subGenre: classification.subGenre?.name || "",
    type: classification.type?.name || "",
    subType: classification.subType?.name || "",
  };
}

function getKeywordText(rawEvent) {
  const rawJson = rawEvent.raw_json || {};
  const classifications = getTicketmasterClassifications(rawJson);

  return [
    rawEvent.raw_title,
    rawEvent.raw_description,
    classifications.segment,
    classifications.genre,
    classifications.subGenre,
    classifications.type,
    classifications.subType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isFreeEvent(rawEvent) {
  const rawJson = rawEvent.raw_json || {};
  const priceText = String(rawEvent.raw_price_text || "").toLowerCase();

  if (priceText.includes("free")) {
    return true;
  }

  if (Array.isArray(rawJson.priceRanges)) {
    return rawJson.priceRanges.some((price) => Number(price.min) === 0);
  }

  return false;
}

function inferCategory(rawEvent) {
  const text = getKeywordText(rawEvent);


  if (
    text.includes("concert") ||
    text.includes("music") ||
    text.includes("rock") ||
    text.includes("pop") ||
    text.includes("hip-hop") ||
    text.includes("r&b") ||
    text.includes("jazz") ||
    text.includes("classical") ||
    text.includes("dance/electronic")
  ) {
    return "music";
  }

  if (
    text.includes("festival") ||
    text.includes("fair") ||
    text.includes("celebration")
  ) {
    return "festival";
  }

  if (
    text.includes("comedy") ||
    text.includes("comedian") ||
    text.includes("stand-up") ||
    text.includes("standup")
  ) {
    return "comedy";
  }

  if (
    text.includes("art") ||
    text.includes("exhibition") ||
    text.includes("museum") ||
    text.includes("gallery") ||
    text.includes("theatre") ||
    text.includes("theater") ||
    text.includes("arts")
  ) {
    return "art";
  }

  if (
    text.includes("food") ||
    text.includes("market") ||
    text.includes("wine") ||
    text.includes("beer") ||
    text.includes("restaurant")
  ) {
    return "food";
  }

  if (
    text.includes("workshop") ||
    text.includes("class") ||
    text.includes("course") ||
    text.includes("training")
  ) {
    return "workshop";
  }

  if (
    text.includes("career") ||
    text.includes("networking") ||
    text.includes("business") ||
    text.includes("conference") ||
    text.includes("expo")
  ) {
    return "career";
  }

  if (
    text.includes("student") ||
    text.includes("university") ||
    text.includes("college") ||
    text.includes("campus") ||
    text.includes("ubc") ||
    text.includes("sfu")
  ) {
    return "student";
  }

  if (
    text.includes("nightlife") ||
    text.includes("club") ||
    text.includes("dj") ||
    text.includes("party")
  ) {
    return "nightlife";
  }

  return "music";
}

function getPriceText(rawEvent) {
  const rawJson = rawEvent.raw_json || {};

  if (isFreeEvent(rawEvent)) {
    return "Free";
  }

  if (rawEvent.raw_price_text) {
    return rawEvent.raw_price_text;
  }

  if (Array.isArray(rawJson.priceRanges) && rawJson.priceRanges.length > 0) {
    const price = rawJson.priceRanges[0];
    const currency = price.currency || "CAD";

    if (price.min != null && price.max != null) {
      return `${currency} ${price.min}-${price.max}`;
    }

    if (price.min != null) {
      return `${currency} ${price.min}+`;
    }
  }

  return "Check ticket page";
}

function getTags(rawEvent) {
  const rawJson = rawEvent.raw_json || {};
  const classifications = getTicketmasterClassifications(rawJson);

  return [
    SOURCE_NAME,
    classifications.segment,
    classifications.genre,
    classifications.subGenre,
  ]
    .map(cleanText)
    .filter(Boolean);
}

function mapRawEventToEvent(rawEvent) {
  const rawJson = rawEvent.raw_json || {};
  const venue = getPrimaryVenue(rawJson);
  const start = rawJson?.dates?.start || {};
  const category = inferCategory(rawEvent);

  const latitude = parseNumber(venue?.location?.latitude);
  const longitude = parseNumber(venue?.location?.longitude);

  return {
    title: cleanText(rawEvent.raw_title) || "Untitled event",
    category,
    venue: cleanText(venue?.name),
    address: cleanText(venue?.address?.line1),
    area: cleanText(venue?.city?.name) || "Vancouver",
    city: cleanText(venue?.city?.name) || "Vancouver",
    lat: latitude,
    lng: longitude,
    event_date: start.localDate || null,
    start_time: start.localTime || null,
    end_time: null,
    price: getPriceText(rawEvent),
    is_free: isFreeEvent(rawEvent),
    description:
      cleanText(rawEvent.raw_description) ||
      cleanText(rawJson.info) ||
      cleanText(rawJson.pleaseNote),
    image_url: rawEvent.raw_image_url || null,
    ticket_url: rawEvent.raw_ticket_url || rawJson.url || null,
    source_url: rawEvent.source_url || rawJson.url || null,
    organizer_name: cleanText(rawJson.promoter?.name),
    tags: getTags(rawEvent),
    status: "pending",
  };
}

function validateEvent(event) {
  if (!event.title) {
    return "Missing title";
  }

  if (!event.event_date) {
    return "Missing event date";
  }

  if (!event.lat || !event.lng) {
    return "Missing latitude or longitude";
  }

  if (!event.source_url) {
    return "Missing source URL";
  }

  return null;
}

async function markRawEventAsError(rawEventId, message) {
  const { error } = await supabase
    .from("raw_events")
    .update({
      import_status: "error",
      error_message: message,
    })
    .eq("id", rawEventId);

  if (error) {
    console.error(`Failed to mark raw event ${rawEventId} as error:`, error);
  }
}

async function markRawEventAsNormalized(rawEventId, eventId) {
  const { error } = await supabase
    .from("raw_events")
    .update({
      import_status: "normalized",
      error_message: null,
      normalized_event_id: eventId,
    })
    .eq("id", rawEventId);

  if (error) {
    console.error(
      `Failed to mark raw event ${rawEventId} as normalized:`,
      error
    );
  }
}
async function updateExistingEvent(eventId, event) {
  const { error } = await supabase
    .from("events")
    .update(event)
    .eq("id", eventId);

  if (error) {
    throw error;
  }
}

async function findExistingEvent(rawEvent, event) {
  if (rawEvent.normalized_event_id) {
    const { data, error } = await supabase
      .from("events")
      .select("id")
      .eq("id", rawEvent.normalized_event_id)
      .limit(1);

    if (error) {
      throw error;
    }

    if (data?.[0]) {
      return data[0];
    }
  }

  if (event.source_url) {
    const { data, error } = await supabase
      .from("events")
      .select("id")
      .eq("source_url", event.source_url)
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) {
      throw error;
    }

    if (data?.[0]) {
      return data[0];
    }
  }

  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("title", event.title)
    .eq("event_date", event.event_date)
    .eq("start_time", event.start_time)
    .eq("venue", event.venue)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] || null;
}

async function fetchRawEventsToNormalize() {
  const { data, error } = await supabase
    .from("raw_events")
    .select("*")
    .eq("source_name", SOURCE_NAME)
    .eq("import_status", "new")
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) {
    throw error;
  }

  return data || [];
}

async function normalizeTicketmasterRawEvents() {
  console.log("Starting Ticketmaster normalization...");

  const rawEvents = await fetchRawEventsToNormalize();

  if (rawEvents.length === 0) {
    console.log("No new Ticketmaster raw events to normalize.");
    return;
  }

  console.log(`Found ${rawEvents.length} raw events to normalize.`);

  let normalizedCount = 0;
  let linkedExistingCount = 0;
  let errorCount = 0;

  for (const rawEvent of rawEvents) {
    try {
      const event = mapRawEventToEvent(rawEvent);
      const validationError = validateEvent(event);

      if (validationError) {
        errorCount += 1;
        await markRawEventAsError(rawEvent.id, validationError);
        console.log(`Skipped raw event ${rawEvent.id}: ${validationError}`);
        continue;
      }

      const autoApprovalIssue = getAutoApprovalIssue(event);
      event.status = autoApprovalIssue ? "pending" : "approved";

      if (autoApprovalIssue) {
        console.log(`Needs review: ${event.title} (${autoApprovalIssue})`);
      }

      const existingEvent = await findExistingEvent(rawEvent, event);

      if (existingEvent) {
        linkedExistingCount += 1;
        await updateExistingEvent(existingEvent.id, event);
        await markRawEventAsNormalized(rawEvent.id, existingEvent.id);
        console.log(`Updated existing ${event.status} event: ${event.title}`);
        continue;
      }

      const { data: insertedEvent, error: insertError } = await supabase
        .from("events")
        .insert(event)
        .select("id")
        .single();

      if (insertError) {
        throw insertError;
      }

      await markRawEventAsNormalized(rawEvent.id, insertedEvent.id);

      normalizedCount += 1;
      console.log(`Normalized ${event.status}: ${event.title}`);
    } catch (error) {
      errorCount += 1;

      const message =
        error?.message || JSON.stringify(error) || "Unknown normalization error";

      await markRawEventAsError(rawEvent.id, message);
      console.error(`Failed raw event ${rawEvent.id}: ${message}`);
    }
  }

  console.log("Ticketmaster normalization complete.");
  console.log(`Normalized new events: ${normalizedCount}`);
  console.log(`Updated existing events: ${linkedExistingCount}`);
  console.log(`Errors: ${errorCount}`);
}

normalizeTicketmasterRawEvents().catch((error) => {
  console.error("Normalization failed:");
  console.error(error);
  process.exit(1);
});
