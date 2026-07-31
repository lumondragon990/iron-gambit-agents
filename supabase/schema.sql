-- Iron Gambit agents. Run this once in Supabase > SQL Editor.

create table if not exists agent_runs (
  id          bigserial primary key,
  agent       text not null,
  output      text,
  trigger     text default 'cron',
  sources     jsonb default '[]'::jsonb,
  tokens_in   int,
  tokens_out  int,
  created_at  timestamptz default now()
);
create index if not exists agent_runs_agent_idx on agent_runs (agent, created_at desc);

create table if not exists events (
  id          bigserial primary key,
  name        text not null,
  venue       text,
  event_date  date,
  cost        text,
  apply_url   text,
  fit_score   int,
  deadline    date,
  notes       text,
  status      text default 'new',      -- new | applied | booked | passed
  created_at  timestamptz default now(),
  unique (name, event_date)
);
create index if not exists events_fit_idx on events (fit_score desc, event_date);

create table if not exists outbox (
  id          bigserial primary key,
  agent       text not null,
  to_name     text,
  handle      text,
  platform    text,
  to_email    text,
  subject     text,
  body        text not null,
  notes       text,
  status      text default 'pending',  -- pending | sent | rejected | failed
  error       text,
  sent_at     timestamptz,
  created_at  timestamptz default now()
);
create index if not exists outbox_status_idx on outbox (status, created_at desc);

-- Everything here is written by the service_role key from the server.
-- RLS on with no policies = no browser can read it. That is what we want.
alter table agent_runs enable row level security;
alter table events     enable row level security;
alter table outbox     enable row level security;
