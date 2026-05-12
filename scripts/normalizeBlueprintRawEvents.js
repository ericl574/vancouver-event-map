import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import { findBestEventMatch } from "./lib/eventDedupe.js";
import { getVenueCoordinates } from "./lib/venueCoordinates.js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL in .env.local");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SOURCE_NAME = "blueprint";
const BATCH_LIMIT = Number(process.env.BLUEPRINT_NORMALIZE_BATCH_LIMIT || 150);
const AUTO_APPROVE_MAX_DAYS_AHEAD = 365;
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

function getKeywordText(rawEvent) {
  const rawJson = rawEvent.raw_json || {};

  return [
    rawEvent.raw_title,
    rawEvent.raw_description,
    rawEvent.raw_location_text,
    rawJson.location_name,
    rawJson.venue_address,
    rawJson.genre,
    rawJson.genre_search,
    rawJson.live,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function inferCategory(rawEvent) {
  const text = getKeywordText(rawEvent);

  if (
    text.includes("club") ||
    text.includes("dj") ||
    text.includes("dance") ||
    text.includes("celebrities") ||
    text.includes("village studios") ||
    text.includes("foundation") ||
    text.includes("after party")
  ) {
    return "nightlife";
  }

  if (
    text.includes("concert") ||
    text.includes("live") ||
    text.includes("ballroom") ||
    text.includes("theatre") ||
    text.includes("sound club") ||
    text.includes("malkin bowl")
  ) {
    return "music";
  }

  if (text.includes("festival") || text.includes("open air")) {
    return "festival";
  }

  return "music";
}

function getTags(rawEvent) {
  const rawJson = rawEvent.raw_json || {};

  return [
    SOURCE_NAME,
    rawJson.location_name,
    rawJson.city,
    rawJson.genre,
    rawJson.live,
    rawJson.status,
  ]
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 12);
}

function getVenue(rawEvent) {
  const rawJson = rawEvent.raw_json || {};

  return {
    venue: cleanText(rawJson.location_name),
    location_name: cleanText(rawJson.location_name),
    address: cleanText(rawJson.venue_address),
  };
}

function mapRawEventToEvent(rawEvent) {
  const rawJson = rawEvent.raw_json || {};
  const venue = getVenue(rawEvent);

  if (!venue.venue) {
    return {
      event: null,
      issue: "Missing Blueprint venue",
    };
  }

  const coordinates = getVenueCoordinates(venue);

  if (!coordinates) {
    return {
      event: null,
      issue: `Unsupported Blueprint venue: ${venue.venue}`,
    };
  }

  const city = "Vancouver";
  const category = inferCategory(rawEvent);

  return {
    event: {
      title: cleanText(rawEvent.raw_title) || "Untitled Blueprint event",
      category,
      venue: venue.venue,
      address: venue.address,
      area: city,
      city,
      lat: coordinates.lat,
      lng: coordinates.lng,
      event_date: rawJson.date || rawEvent.raw_date_text,
      start_time: null,
      end_time: null,
      price: "Check event page",
      is_free: false,
      description: cleanText(rawEvent.raw_description),
      image_url: rawEvent.raw_image_url || rawJson.image_url || null,
      ticket_url: rawEvent.raw_ticket_url || rawJson.ticket_link || rawEvent.source_url,
      source_url: rawEvent.source_url,
      organizer_name: "Blueprint",
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

  const eventDate = new Date(`${event.event_date}T00:00:00`);

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
      `Cross-platform URL matched Blueprint event: ${event.title} -> ${data[0].source_name}`
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
    .limit(200);

  if (error) {
    throw error;
  }

  const bestMatch = findBestEventMatch(data || [], event);

  if (!bestMatch) {
    return null;
  }

  console.log(
    `Fuzzy matched Blueprint event: ${event.title} -> ${bestMatch.event.title} (score ${bestMatch.score})`
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

async function normalizeBlueprintRawEvents() {
  console.log("Starting Blueprint normalization...");
  console.log(`Mode: ${DRY_RUN ? "dry run" : "write"}`);

  const rawEvents = await fetchRawEventsToNormalize();

  if (rawEvents.length === 0) {
    console.log("No new Blueprint raw events to normalize.");
    return;
  }

  console.log(`Found ${rawEvents.length} Blueprint raw events to normalize.`);

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
        console.log(`Rejected Blueprint raw event ${rawEvent.id}: ${issue}`);
        continue;
      }

      const validationError = validateEvent(event);

      if (validationError) {
        errorCount += 1;
        await markRawEventAsError(rawEvent.id, validationError);
        console.log(`Skipped Blueprint raw event ${rawEvent.id}: ${validationError}`);
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
        console.log(`Updated existing ${event.status} Blueprint event: ${event.title}`);
        continue;
      }

      const insertedEvent = await insertEvent(event);

      normalizedCount += 1;
      await upsertEventSource(rawEvent, event, insertedEvent.id);
      await markRawEventAsNormalized(rawEvent.id, insertedEvent.id);
      console.log(`Normalized ${event.status} Blueprint event: ${event.title}`);
    } catch (error) {
      errorCount += 1;

      const message =
        error?.message || JSON.stringify(error) || "Unknown Blueprint normalization error";

      await markRawEventAsError(rawEvent.id, message);
      console.error(`Failed Blueprint raw event ${rawEvent.id}: ${message}`);
    }
  }

  console.log("Blueprint normalization complete.");
  console.log(`Normalized new events: ${normalizedCount}`);
  console.log(`Updated existing events: ${linkedExistingCount}`);
  console.log(`Skipped map-ineligible events: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
}

normalizeBlueprintRawEvents().catch((error) => {
  console.error("Blueprint normalization failed:");
  console.error(error);
  process.exit(1);
});
