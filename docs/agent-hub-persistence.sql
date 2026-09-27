-- Agent Hub dedicated persistence schema.
-- Apply only to the dedicated Agent Hub Supabase project.
-- Do NOT run this against PRINTSHOP production Supabase.

create table if not exists public.agent_registry (
  id text primary key,
  name text not null,
  role text not null,
  status text not null,
  target text not null,
  capabilities jsonb not null default '[]'::jsonb,
  protected_areas jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_tasks (
  id uuid primary key,
  agent_id text not null references public.agent_registry(id) on delete restrict,
  message text not null,
  status text not null check (status in ('queued','running','completed','failed')),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.agent_events (
  id uuid primary key,
  type text not null,
  agent_id text not null references public.agent_registry(id) on delete restrict,
  task_id uuid references public.agent_tasks(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null
);

create index if not exists agent_tasks_agent_created_idx
  on public.agent_tasks (agent_id, created_at desc);

create index if not exists agent_events_agent_created_idx
  on public.agent_events (agent_id, created_at desc);

create index if not exists agent_events_task_created_idx
  on public.agent_events (task_id, created_at desc);

alter table public.agent_registry enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.agent_events enable row level security;

revoke all on public.agent_registry from anon, authenticated;
revoke all on public.agent_tasks from anon, authenticated;
revoke all on public.agent_events from anon, authenticated;

-- The Agent Hub server uses its server-side Supabase key.
-- No browser client should read or write these tables directly.
