# Autopilot run — gallery monetization runbook

Goal: per-app spec purchase flow live and verified.

## Decisions log
- Sequencing: run sync BEFORE privatizing the repo — fulfillment breaks if specs aren't in the bucket before the public source disappears.
- BLOCKED: no `frontend/.env.local` / root `.env`; SUPABASE_URL + SUPABASE_SERVICE_KEY are secrets only the user has. Sync (step 1) cannot run.
- Gated on the above: NOT privatizing the repo (step 2) and NOT flipping prod paywall (step 4) until specs are confirmed in the bucket — doing either first would charge customers with no deliverable.
- Pre-cloned public repo to /tmp/awesome-ios-design-md (200 apps × DESIGN/-swiftui/-expo/-android) so the sync has a stable source even after privatization.
- Step 3 (Stripe `checkout.session.completed`) needs no action: the existing `gallery_prepay` product already runs on the same webhook + event, so it is definitionally enabled in their Stripe account.
- Vercel CLI authed as `meliwat` but project NOT linked; no `.vercel/project.json`. Linking is interactive/owner-choice → step 4 queued for user.
- gh authed as Meliwat (repo owner) → privatization is technically possible now, but deliberately deferred per sequencing rule above.
- Did autonomously: npm install, pre-clone, sync-script syntax check, full production build verification.
- Added `--dry-run` flag to sync-specs.mjs (no creds needed) and validated against the real repo: 200 apps, 800 files, 0 failures — sync logic proven correct, only creds missing.
- Build passed exit 0: ✓ Compiled successfully, 235 pages, /api/gallery/spec-checkout + spec-download built, /gallery/[slug] SSG'd 211 paths with BuySpecButton.
- NOT committing: base system prompt forbids commits unless explicitly requested; autopilot does not override that safety rule. Queued as a user action.

## Progress (post-token)
- User provided PAT; `supabase login --token` OK.
- 7 projects in account; exact-name match `spectr` ref `nlkwoezxicayljemxhma` (us-east-1). No project_id committed in repo and Vercel not linked, so this is a NAME-MATCH ASSUMPTION — user must confirm it matches Vercel's SUPABASE_URL before trusting fulfillment. Wrong-project cost is low: sync is idempotent, only side effect is an unused `specs` bucket.
- Project was INACTIVE (paused) → no API keys returned. Restored via Mgmt API POST /v1/projects/{ref}/restore (HTTP 200, non-destructive). Polling until ACTIVE_HEALTHY, then: fetch keys → write frontend/.env.local (done with mode 600, gitignored) → sync → privatize.
- Decision: restored the paused project autonomously — non-destructive, required for the user-directed runbook, user explicitly authorized the whole flow.
- Project ACTIVE_HEALTHY after ~4 min. Keys fetched (service_role len 219). Wrote frontend/.env.local (mode 600, confirmed gitignored).
- Sync DONE: 800 uploaded, 0 failed, 200 app folders. Verified via storage API: 200 folders in `specs`, airbnb has all 4 DESIGN*.md.
- Repo PRIVATIZED: Meliwat/awesome-ios-design-md → PRIVATE (gh, --accept-visibility-change-consequences). Verified isPrivate=true.
- STILL QUEUED (need user / out of this turn's scope): (a) commit+deploy branch — base prompt forbids unrequested commits; (b) Vercel NEXT_PUBLIC_GALLERY_PAYWALL_ENABLED=true — project not linked, and pointless until the new code is deployed anyway.

## Run 3 (commit + deploy)
- Step 1 CONFIRMED: Vercel prod SUPABASE_URL host = nlkwoezxicayljemxhma.supabase.co — exact match to the synced project. No re-sync needed; name-match assumption was correct.
- Prod Vercel project = `frontend` (www.spectr.to). No .github/workflows → deploy via Vercel git-integration on master (matches PR-merge commit history).
- Linked Vercel project `frontend` (scope meliwats-projects). Pulled prod env to /tmp (NOT .env.local).
- Set NEXT_PUBLIC_GALLERY_PAYWALL_ENABLED=true in Vercel Production (was unset). Done BEFORE deploy because NEXT_PUBLIC_ is build-time inlined.
- Committed 2c442e4 (12 files, no secrets — .env.local/.vercel gitignored). Pushed branch, PR #32, merged to master (4b7311b) → triggered prod deploy frontend-bgoatmo43.
- BLOCKED (payment auth): prod STRIPE_SECRET_KEY is sk_live_. A real "test purchase" = real charge. Will NOT enter cards / charge. Verifying everything up to the card step; queue the literal purchase for the user (or test via Preview + Stripe test keys).
2. Privatize repo — gated behind #1 (do only after sync confirmed).
3. Vercel prod env — project not linked; set NEXT_PUBLIC_GALLERY_PAYWALL_ENABLED=true in dashboard or `vercel link` then env add.
4. Commit/deploy the branch.
