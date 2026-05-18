-- Vancouver Event Map multi-source event architecture.
-- One row in public.events is the canonical public event.
-- Multiple rows in public.event_sources can point to the same event.

create table if not exists public.event_sources (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null references public.events(id) on delete cascade,

  source_name text not null,
  external_id text,
  source_url text not null,
  ticket_url text,

  source_title text,
  source_venue text,
  source_date date,
  source_time time without time zone,
  source_price_text text,

  raw_event_id uuid references public.raw_events(id) on delete set null,

  first_seen_at timestamp with time zone not null default now(),
  last_seen_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create unique index if not exists event_sources_source_url_unique_idx
on public.event_sources (source_name, source_url);

create unique index if not exists event_sources_external_id_unique_idx
on public.event_sources (source_name, external_id)
where external_id is not null;

create index if not exists event_sources_event_id_idx
on public.event_sources (event_id);

create index if not exists event_sources_source_name_idx
on public.event_sources (source_name);
