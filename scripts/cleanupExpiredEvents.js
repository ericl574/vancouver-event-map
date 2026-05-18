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

const DRY_RUN = process.argv.includes("--dry-run");
const RAW_RETENTION_DAYS = Number(process.env.RAW_EVENTS_RETENTION_DAYS || 14);
const BATCH_SIZE = 500;

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function getRetentionCutoffIso() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RAW_RETENTION_DAYS);
  return cutoff.toISOString();
}

function extractDateFromRawDateText(value) {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || null;
}

async function fetchExpiredEventIds(today) {
  const { data, error } = await supabase
    .from("events")
    .select("id,title,event_date")
    .lt("event_date", today)
    .limit(BATCH_SIZE);

  if (error) throw error;

  return data || [];
}

async function fetchRawEventsForCleanup(today, retentionCutoffIso) {
  const { data, error } = await supabase
    .from("raw_events")
    .select("id,raw_title,raw_date_text,import_status,created_at")
    .limit(5000);

  if (error) throw error;

  const expiredRawEvents = [];
  const oldProcessedRawEvents = [];

  for (const row of data || []) {
    const rawDate = extractDateFromRawDateText(row.raw_date_text);

    if (rawDate && rawDate < today) {
      expiredRawEvents.push(row);
      continue;
    }

    const isProcessed = row.import_status !== "new";
    const isOld = row.created_at && row.created_at < retentionCutoffIso;

    if (isProcessed && isOld) {
      oldProcessedRawEvents.push(row);
    }
  }

  const ids = new Set();

  for (const row of expiredRawEvents) ids.add(row.id);
  for (const row of oldProcessedRawEvents) ids.add(row.id);

  return {
    expiredRawEvents,
    oldProcessedRawEvents,
    rawEventIdsToDelete: Array.from(ids),
  };
}

async function deleteByIds(tableName, ids) {
  if (ids.length === 0) return 0;

  let deletedCount = 0;

  for (let index = 0; index < ids.length; index += BATCH_SIZE) {
    const batch = ids.slice(index, index + BATCH_SIZE);

    const { data, error } = await supabase
      .from(tableName)
      .delete()
      .in("id", batch)
      .select("id");

    if (error) throw error;

    deletedCount += data?.length || 0;
  }

  return deletedCount;
}

async function cleanupExpiredEvents() {
  const today = getTodayDateString();
  const retentionCutoffIso = getRetentionCutoffIso();

  console.log("Starting event cleanup...");
  console.log(`Mode: ${DRY_RUN ? "dry run" : "delete"}`);
  console.log(`Today: ${today}`);
  console.log(`Raw event retention: ${RAW_RETENTION_DAYS} days`);
  console.log(`Raw retention cutoff: ${retentionCutoffIso}`);

  const expiredEvents = await fetchExpiredEventIds(today);
  const {
    expiredRawEvents,
    oldProcessedRawEvents,
    rawEventIdsToDelete,
  } = await fetchRawEventsForCleanup(today, retentionCutoffIso);

  console.log("");
  console.log("Cleanup preview:");
  console.log(`Expired public events: ${expiredEvents.length}`);
  console.log(`Expired raw events: ${expiredRawEvents.length}`);
  console.log(`Old processed raw events: ${oldProcessedRawEvents.length}`);
  console.log(`Unique raw_events to delete: ${rawEventIdsToDelete.length}`);

  if (expiredEvents.length > 0) {
    console.log("");
    console.log("Sample expired events:");
    for (const event of expiredEvents.slice(0, 5)) {
      console.log(`- ${event.event_date}: ${event.title}`);
    }
  }

  if (DRY_RUN) {
    console.log("");
    console.log("Dry run complete. No rows were deleted.");
    return;
  }

  // Delete raw rows first so deleting events does not leave source history behind.
  const deletedRawCount = await deleteByIds("raw_events", rawEventIdsToDelete);
  const deletedEventCount = await deleteByIds(
    "events",
    expiredEvents.map((event) => event.id)
  );

  console.log("");
  console.log("Cleanup complete.");
  console.log(`Deleted raw_events: ${deletedRawCount}`);
  console.log(`Deleted events: ${deletedEventCount}`);
}

cleanupExpiredEvents().catch((error) => {
  console.error("Cleanup failed:");
  console.error(error);
  process.exit(1);
});
