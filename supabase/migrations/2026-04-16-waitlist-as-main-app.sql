-- 2026-04-16 — waitlist-as-main-app redesign
-- Public landing page drives both paid and free-demo flows. Projects can
-- exist before a user row exists (created by Stripe webhook), and the
-- progress screen is reachable via a signed access token while the user
-- is anonymous. Waitlist table grows to track the same project ids so
-- the admin dashboard can show a unified view.

-- ─── Projects: email + access_token ──────────────────────────────────────
alter table projects
  add column if not exists email text,
  add column if not exists access_token text;

create unique index if not exists projects_access_token_idx
  on projects(access_token)
  where access_token is not null;

create index if not exists projects_email_idx on projects(email);

-- `awaiting_payment` status is a new transient state for anonymous paid
-- uploads that haven't completed Stripe Checkout yet. No constraint on
-- status column to enforce, but document the expectation here.
comment on column projects.status is
  'pending | awaiting_payment | awaiting_manual_processing | extracting | analyzing_screens | analyzing_transitions | synthesizing_schema | generating_backend | generating_frontend | validating | repairing | bundling | complete | failed';

-- ─── Waitlist: link to the projects table + track mode ──────────────────
alter table waitlist
  add column if not exists reference_app text,
  add column if not exists your_app_name text,
  add column if not exists project_id uuid references projects(id) on delete set null,
  add column if not exists mode text default 'sample';

create index if not exists waitlist_project_id_idx on waitlist(project_id);
create index if not exists waitlist_mode_status_idx on waitlist(mode, status);
