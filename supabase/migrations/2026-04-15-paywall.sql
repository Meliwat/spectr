-- 2026-04-15 — Paywall + free-sample design
-- Spec: docs/superpowers/specs/2026-04-15-paywall-and-free-sample-design.md

-- ─── spec_credits table ──────────────────────────────────────────────────
create table if not exists spec_credits (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  status              text not null default 'available'
                      check (status in ('available', 'consumed', 'refunded')),
  source              text not null default 'stripe'
                      check (source in ('stripe', 'comp', 'refund')),
  stripe_session_id   text,
  stripe_payment_id   text,
  amount_cents        int,
  project_id          uuid references projects(id) on delete set null,
  created_at          timestamptz default now(),
  consumed_at         timestamptz
);

create index if not exists spec_credits_user_status_idx
  on spec_credits(user_id, status);

create unique index if not exists spec_credits_session_idx
  on spec_credits(stripe_session_id);

alter table spec_credits enable row level security;

create policy "spec_credits_owner_select"
  on spec_credits for select to authenticated
  using (auth.uid() = user_id);
-- No INSERT/UPDATE/DELETE policies for authenticated:
-- all writes happen via service-role API routes.

-- ─── projects.processing_mode column ─────────────────────────────────────
alter table projects
  add column if not exists processing_mode text not null default 'auto';

alter table projects
  drop constraint if exists projects_processing_mode_check;
alter table projects
  add constraint projects_processing_mode_check
  check (processing_mode in ('auto', 'manual', 'gallery'));

create index if not exists projects_mode_status_idx
  on projects(processing_mode, status);
