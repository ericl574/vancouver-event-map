-- Vancouver Event Map database maintenance helpers.
-- Keep this file as documentation for the live Supabase schema and cleanup policy.

-- Preview expired public events.
select id, title, event_date, venue, status
from public.events
where event_date < current_date
order by event_date asc;

-- Delete expired public events.
-- Today's events are kept. Only yesterday and older are deleted.
delete from public.events
where event_date < current_date;

-- Preview expired raw events where raw_date_text starts with YYYY-MM-DD.
select id, source_name, external_id, raw_title, raw_date_text, import_status
from public.raw_events
where raw_date_text ~ '^\d{4}-\d{2}-\d{2}'
  and left(raw_date_text, 10)::date < current_date
order by raw_date_text asc;

-- Delete expired raw events where raw_date_text starts with YYYY-MM-DD.
delete from public.raw_events
where raw_date_text ~ '^\d{4}-\d{2}-\d{2}'
  and left(raw_date_text, 10)::date < current_date;

-- Optional raw event retention.
-- Keeps raw_events temporary so raw_json does not grow forever.
delete from public.raw_events
where import_status <> 'new'
  and created_at < now() - interval '14 days';
