create extension if not exists "uuid-ossp";

create table projects (
  id                uuid primary key default uuid_generate_v4(),
  status            text not null default 'pending',
  mp4_s3_key        text,
  reference_app     text not null,
  your_app_name     text,
  brand_colors      jsonb,
  logo_s3_key       text,
  bundle_id         text,
  frame_count       int,
  frontend_spec     text,
  backend_spec      text,
  screen_analysis   jsonb,
  transitions       jsonb,
  canonical_schema  jsonb,
  repair_attempts   integer default 0,
  total_retries     integer default 0,
  spec_md_s3_key    text,
  spec_md_text      text,
  bundle_s3_key     text,
  error_text        text,
  user_id           uuid references auth.users(id) on delete cascade,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists projects_user_id_idx on projects (user_id);

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

alter publication supabase_realtime add table projects;

-- Row-Level Security.
-- Service role (worker + server API routes) bypasses RLS automatically.
-- Authenticated users can only see / mutate rows they own.
alter table projects enable row level security;

create policy "projects_owner_select"
  on projects for select to authenticated
  using (user_id = auth.uid());

create policy "projects_owner_insert"
  on projects for insert to authenticated
  with check (user_id = auth.uid());

create policy "projects_owner_update"
  on projects for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Waitlist: write-only via server API; lock down with RLS (no policies →
-- only service_role can read/write).
alter table waitlist enable row level security;
