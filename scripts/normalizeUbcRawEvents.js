import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import { findBestEventMatch } from "./lib/eventDedupe.js";
import {
  getVenueCoordinates,
  isUnsupportedMapVenue,
} from "./lib/venueCoordinates.js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL in .env.local");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SOURCE_NAME = "ubc_events";
const BATCH_LIMIT = Number(process.env.UBC_NORMALIZE_BATCH_LIMIT || 500);
const AUTO_APPROVE_MAX_DAYS_AHEAD = 180;
const DRY_RUN = process.argv.includes("--dry-run");

const GREATER_VANCOUVER_BOUNDS = {
  minLat: 49.0,
  maxLat: 49.5,
  minLng: -123.35,
  maxLng: -122.45,
};

function cleanText(value) {
  if (!value) return "";

  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function splitDateTime(value) {
  const text = String(value || "").trim();

  if (!text) {
    return {
      date: null,
      time: null,
    };
  }

  const [date, time] = text.split(" ");

  return {
    date: date || null,
    time: time || null,
  };
}

function getKeywordText(rawEvent) {
  const rawJson = rawEvent.raw_json || {};

  return [
    rawEvent.raw_title,
    rawEvent.raw_description,
    rawEvent.raw_location_text,
    ...(rawJson.categories || []),
    ...(rawJson.organizers || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isFreeEvent(rawEvent) {
  const text = `${rawEvent.raw_price_text || ""} ${getKeywordText(rawEvent)}`.toLowerCase();

  return text.includes("free");
}

function inferCategory(rawEvent) {
  const text = getKeywordText(rawEvent);

  if (
    text.includes("career") ||
    text.includes("job") ||
    text.includes("networking") ||
    text.includes("professional development") ||
    text.includes("conference") ||
    text.includes("symposium")
  ) {
    return "career";
  }

  if (
    text.includes("workshop") ||
    text.includes("course") ||
    text.includes("training") ||
    text.includes("clinic")
  ) {
    return "workshop";
  }

  if (
    text.includes("gallery") ||
    text.includes("exhibit") ||
    text.includes("arts") ||
    text.includes("film") ||
    text.includes("music") ||
    text.includes("auditorium")
  ) {
    return "art";
  }

  if (
    text.includes("farm") ||
    text.includes("food") ||
    text.includes("cooking") ||
    text.includes("dumpling") ||
    text.includes("edibles")
  ) {
    return "food";
  }

  if (isFreeEvent(rawEvent)) {
    return "free";
  }

  return "student";
}

function getPriceText(rawEvent) {
  if (isFreeEvent(rawEvent)) {
    return "Free";
  }

  return cleanText(rawEvent.raw_price_text) || "Check event page";
}

function getTags(rawEvent) {
  const rawJson = rawEvent.raw_json || {};

  return [
    SOURCE_NAME,
    ...(rawJson.categories || []),
    ...(rawJson.organizers || []),
  ]
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 12);
}

function mapRawEventToEvent(rawEvent) {
  const rawJson = rawEvent.raw_json || {};
  const venue = rawJson.venue || null;
  const unsupportedVenueReason = isUnsupportedMapVenue(venue);

  if (unsupportedVenueReason) {
    return {
      event: null,
      issue: unsupportedVenueReason,
    };
  }

  const coordinates = getVenueCoordinates(venue);

  if (!coordinates) {
    return {
      event: null,
      issue: `Unsupported UBC venue: ${cleanText(venue?.venue) || "unknown"}`,
    };
  }

  const start = splitDateTime(rawJson.start_date || rawEvent.raw_date_text);
  const end = splitDateTime(rawJson.end_date);
  const category = inferCategory(rawEvent);
  const address = cleanText(venue?.address);
  const city = cleanText(venue?.city) || "Vancouver";

  return {
    event: {
      title: cleanText(rawEvent.raw_title) || "Untitled UBC event",
      category,
      venue: cleanText(venue?.venue),
      address,
      area: city,
      city,
      lat: coordinates.lat,
      lng: coordinates.lng,
      event_date: start.date,
      start_time: start.time,
      end_time: end.time,
      price: getPriceText(rawEvent),
      is_free: isFreeEvent(rawEvent),
      description: cleanText(rawEvent.raw_description),
      image_url: rawEvent.raw_image_url || rawJson.image_url || null,
      ticket_url: rawEvent.raw_ticket_url || rawJson.website || rawEvent.source_url,
      source_url: rawEvent.source_url || rawJson.url,
      organizer_name: (rawJson.organizers || []).map(cleanText).filter(Boolean).join(", "),
      tags: getTags(rawEvent),
      status: "pending",
    },
    issue: null,
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

async function markRawEventAsError(rawEventId, message) {
  if (DRY_RUN) return;

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

async function markRawEventAsRejected(rawEventId, message) {
  if (DRY_RUN) return;

  const { error } = await supabase
    .from("raw_events")
    .update({
      import_status: "rejected",
      error_message: message,
    })
    .eq("id", rawEventId);

  if (error) {
    console.error(`Failed to mark raw event ${rawEventId} as rejected:`, error);
  }
}

async function markRawEventAsNormalized(rawEventId, eventId) {
  if (DRY_RUN) return;

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
  if (DRY_RUN) return;

  const { error } = await supabase.from("events").update(event).eq("id", eventId);

  if (error) {
    throw error;
  }
}

async function insertEvent(event) {
  if (DRY_RUN) {
    return {
      id: "dry-run-event-id",
    };
  }

  const { data, error } = await supabase
    .from("events")
    .insert(event)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function upsertEventSource(rawEvent, event, eventId) {
  if (DRY_RUN) return;

  const now = new Date().toISOString();

  const sourceRow = {
    event_id: eventId,
    source_name: rawEvent.source_name || SOURCE_NAME,
    external_id: rawEvent.external_id || null,
    source_url: event.source_url,
    ticket_url: event.ticket_url || event.source_url,
    source_title: rawEvent.raw_title || event.title,
    source_venue: rawEvent.raw_location_text || event.venue,
    source_date: event.event_date,
    source_time: event.start_time,
    source_price_text: rawEvent.raw_price_text || event.price,
    raw_event_id: rawEvent.id,
    last_seen_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from("event_sources").upsert(sourceRow, {
    onConflict: "source_name,source_url",
  });

  if (error) {
    throw error;
  }
}

async function findEventBySource(rawEvent, event) {
  const sourceName = rawEvent.source_name || SOURCE_NAME;

  if (rawEvent.external_id) {
    const { data, error } = await supabase
      .from("event_sources")
      .select("event_id")
      .eq("source_name", sourceName)
      .eq("external_id", rawEvent.external_id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    if (data?.[0]?.event_id) {
      return { id: data[0].event_id };
    }
  }

  if (event.source_url) {
    const { data, error } = await supabase
      .from("event_sources")
      .select("event_id")
      .eq("source_name", sourceName)
      .eq("source_url", event.source_url)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    if (data?.[0]?.event_id) {
      return { id: data[0].event_id };
    }
  }

  return null;
}

async function findEventByCrossPlatformUrl(event) {
  const urls = Array.from(
    new Set([event.source_url, event.ticket_url].filter(Boolean))
  );

  if (urls.length === 0) {
    return null;
  }

  const { data, error } = await supabase
    .from("event_sources")
    .select("event_id,source_name,source_url,ticket_url")
    .or(
      [
        `source_url.in.(${urls.map((url) => `"${url}"`).join(",")})`,
        `ticket_url.in.(${urls.map((url) => `"${url}"`).join(",")})`,
      ].join(",")
    )
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  if (data?.[0]?.event_id) {
    console.log(
      `Cross-platform URL matched UBC event: ${event.title} -> ${data[0].source_name}`
    );

    return { id: data[0].event_id };
  }

  return null;
}

async function findExactEventMatch(event) {
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

async function findFuzzyEventMatch(event) {
  const { data, error } = await supabase
    .from("events")
    .select("id,title,event_date,start_time,venue,lat,lng")
    .eq("event_date", event.event_date)
    .order("created_at", { ascending: true })
    .limit(150);

  if (error) {
    throw error;
  }

  const bestMatch = findBestEventMatch(data || [], event);

  if (!bestMatch) {
    return null;
  }

  console.log(
    `Fuzzy matched UBC event: ${event.title} -> ${bestMatch.event.title} (score ${bestMatch.score})`
  );

  return { id: bestMatch.event.id };
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

  const sourceMatch = await findEventBySource(rawEvent, event);

  if (sourceMatch) {
    return sourceMatch;
  }

  const crossPlatformUrlMatch = await findEventByCrossPlatformUrl(event);

  if (crossPlatformUrlMatch) {
    return crossPlatformUrlMatch;
  }

  const exactMatch = await findExactEventMatch(event);

  if (exactMatch) {
    return exactMatch;
  }

  return findFuzzyEventMatch(event);
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

async function normalizeUbcRawEvents() {
  console.log("Starting UBC Events normalization...");
  console.log(`Mode: ${DRY_RUN ? "dry run" : "write"}`);

  const rawEvents = await fetchRawEventsToNormalize();

  if (rawEvents.length === 0) {
    console.log("No new UBC raw events to normalize.");
    return;
  }

  console.log(`Found ${rawEvents.length} UBC raw events to normalize.`);

  let normalizedCount = 0;
  let linkedExistingCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const rawEvent of rawEvents) {
    try {
      const { event, issue } = mapRawEventToEvent(rawEvent);

      if (issue) {
        skippedCount += 1;
        await markRawEventAsRejected(rawEvent.id, issue);
        console.log(`Rejected UBC raw event ${rawEvent.id}: ${issue}`);
        continue;
      }

      const validationError = validateEvent(event);

      if (validationError) {
        errorCount += 1;
        await markRawEventAsError(rawEvent.id, validationError);
        console.log(`Skipped UBC raw event ${rawEvent.id}: ${validationError}`);
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
        await upsertEventSource(rawEvent, event, existingEvent.id);
        await markRawEventAsNormalized(rawEvent.id, existingEvent.id);
        console.log(`Updated existing ${event.status} UBC event: ${event.title}`);
        continue;
      }

      const insertedEvent = await insertEvent(event);

      normalizedCount += 1;
      await upsertEventSource(rawEvent, event, insertedEvent.id);
      await markRawEventAsNormalized(rawEvent.id, insertedEvent.id);
      console.log(`Normalized ${event.status} UBC event: ${event.title}`);
    } catch (error) {
      errorCount += 1;

      const message =
        error?.message || JSON.stringify(error) || "Unknown UBC normalization error";

      await markRawEventAsError(rawEvent.id, message);
      console.error(`Failed UBC raw event ${rawEvent.id}: ${message}`);
    }
  }

  console.log("UBC Events normalization complete.");
  console.log(`Normalized new events: ${normalizedCount}`);
  console.log(`Updated existing events: ${linkedExistingCount}`);
  console.log(`Skipped map-ineligible events: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
}

normalizeUbcRawEvents().catch((error) => {
  console.error("UBC Events normalization failed:");
  console.error(error);
  process.exit(1);
});
