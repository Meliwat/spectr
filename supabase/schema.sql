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
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

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
