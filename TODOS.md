# TODOS

Open follow-ups for the Spectr project. Organized by component, sorted P0 first.

## Gallery / Paywall

### Re-enable gallery paywall

**What:** Set `NEXT_PUBLIC_GALLERY_PAYWALL_ENABLED='true'` in Vercel (all environments) and redeploy.

**Why:** While the flag is unset, the gallery endpoint accepts `{ bypass: true, email, mode, ... }` and mints a free `source='comp'` spec credit. Anyone on the internet can drain the Anthropic budget by POSTing to `/api/projects/gallery`. Closing this is a hard requirement before any meaningful launch traffic.

**Context:** Built during the gallery testing window (commit `9f1d42c` area). Server enforces the flag too (defense-in-depth) so flipping it in Vercel is sufficient; no code change needed. Documented in CLAUDE.md under "Generate-Your-Own-Spec Flow (gallery modal)" and the "Remaining Work" section of `~/.gstack/projects/Meliwat-spectr/checkpoints/20260511-225050-gallery-flow-end-to-end-fixed-and-verified.md`.

**Effort:** S
**Priority:** P0
**Depends on:** Designer customer-dev round complete, or founder decides testing window is closed.

## Worker / Tests

### Fix stale test_pipeline_resume.py expectations

**What:** Update two tests in `worker/tests/test_pipeline_resume.py` to match current production behavior.

**Why:** Both tests fail on master and have been failing since prior PRs landed but were missed in CI (unclear whether CI was even running). Pre-existing stale tests rot the signal of the suite; future contributors will start ignoring failures.

**Context:**
- `test_invalid_section_output_marks_project_failed` (line 259) asserts `RuntimeError` is raised when all spec sections fail validation. Production code intentionally changed to write placeholder sections and continue (CLAUDE.md "partial spec beats no spec"). Fix: assert the project completes with placeholder content instead of raising.
- `test_no_specs_stored_runs_full_pipeline` (line 289) asserts `frontend_spec` starts with `## Screen Batch`. Since PR #3 (`cdd8107 feat(worker): App Store research enrichment`), the worker prepends an `## App Store Research` block. Fix: assert the research block + screen batch both appear.

**Effort:** S (15 min)
**Priority:** P1
**Depends on:** None.

### Worker tests for cache_control + SPEC_SECTION_LANES coverage

**What:** Add tests covering Anthropic prompt-caching attachment (`cache_control: ephemeral` on `SPEC_SECTION_SYSTEM` + cached frontend_spec prefix) and the 7-section / 4-lane parallelism layout.

**Why:** Both shipped in the prior worker-perf PR but lack regression coverage. Test stubs were already drafted by the /review specialist pass and are noted in the prior checkpoint.

**Effort:** M
**Priority:** P2

## Gallery / Backend safety

### listUsers pagination time bomb

**What:** Replace `admin.auth.admin.listUsers({ page: 1, perPage: 200 })` with a proper `getUserByEmail` helper. Two call sites: bypass branch and Stripe branch in `frontend/app/api/projects/gallery/route.ts` (lines ~76 and ~167).

**Why:** Will silently start returning false-negative `not found` once any Spectr-side user count crosses ~200, then mint duplicate auth users (`createUser` is the else branch). Fails open, hard to detect.

**Effort:** S
**Priority:** P1
**Depends on:** None.

### Email-squatting via auto-confirm

**What:** Don't mint a Supabase auth user with `email_confirm: true` for an unverified email from a checkout / bypass flow. Either require email verification before user creation, or use a separate "pending" identity that gets promoted on first sign-in.

**Why:** Current flow lets anyone claim any email by triggering a paid (or bypass) gallery submission with someone else's address. The created user is auto-confirmed and can be signed into via magic-link by the actual owner — but only after the squatter already received the spec. Both branches in `app/api/projects/gallery/route.ts` are affected.

**Effort:** M
**Priority:** P1
**Depends on:** Discussion of preferred identity model.

### Shared cleanEnv() helper

**What:** Extract `(process.env.X ?? '').replace(/\n/g, '').trim()` into a single helper. Currently duplicated across `frontend/lib/supabase.ts`, `frontend/lib/supabase-server.ts`, multiple API routes, and `lib/trigger-worker.ts`.

**Why:** The Vercel-injected-newline gotcha is project-wide (documented in CLAUDE.md "What Not To Do"). Centralizing prevents the next env var added from skipping the trim and silently failing in prod.

**Effort:** S
**Priority:** P2

### Bypass branch idempotency

**What:** Make repeated POSTs to `/api/projects/gallery` with the same `{ bypass: true, email, appStoreUrl }` payload either deduplicate or rate-limit. Currently each call mints a new `source='comp'` credit and new project.

**Why:** Two double-click submissions = two spec generations on the bypass path. Cost matters once the flag is flipped off (no longer applies) but matters for testing-window cost now.

**Effort:** S
**Priority:** P2

### Screenshot fetch concurrency cap

**What:** The gallery route fetches up to 20 App Store screenshots in parallel via `Promise.allSettled`. No concurrency cap. The MCP version (`spectr_mcp/appstore.py`) caps at 8 via `ThreadPoolExecutor(max_workers=8)`. Align the frontend to match.

**Why:** Vercel function memory + outbound concurrency. Currently fine because we don't see traffic, but the wider the gallery opens the more this matters.

**Effort:** S
**Priority:** P3

## spectr-mcp

### Smoke-test the MCP end-to-end against real input

**What:** After this lands, `claude mcp add` the MCP locally, run `generate_spec` against a known-good App Store URL (e.g. DoorDash), and verify the resulting spec.md is structurally identical to the hosted-pipeline output for the same input.

**Why:** Smoke tests during the build verified the stdio handshake and tool schema only. The actual pipeline (vision + spec generation) was assumed correct because it shares worker functions. One real run is the only test that confirms the wrapper doesn't have a subtle integration bug.

**Effort:** S (5 min, ~$1)
**Priority:** P1
**Depends on:** This PR landing on master (so `uvx --from git+...` resolves).

### Publish spectr-mcp to PyPI

**What:** Set up a GitHub Actions release workflow that builds the wheel and publishes to PyPI on a version tag (e.g. `mcp-v0.1.0`).

**Why:** Current install is `uvx --from git+https://github.com/Meliwat/spectr spectr-mcp`. Once published, install becomes `uvx spectr-mcp` (no `--from`), which is the canonical, faster path for users.

**Context:** Skipped intentionally for v0.1.0 — git installs work fine, but the `--from` flag is friction for non-developer users (designers, hackathon people) who'd just see "MCP install" docs.

**Effort:** M
**Priority:** P2
**Depends on:** A few real users on the git path first (so we know we're not publishing a broken v0).

### Lightweight MCP telemetry phone-home

**What:** Add a fire-and-forget HTTPS POST to `https://api.spectr.to/mcp/ping` on `generate_spec` invocation. Send: a stable anonymous install id (random uuid stored at `~/.spectr-mcp/id`), the source type (app-store vs mp4), the resulting spec length. No content, no API key, no user info.

**Why:** Without telemetry, "free MCP for traction" produces zero signal. With it, we can see installs vs runs, decide when to flip on a paywall, identify popular reference apps for case studies.

**Context:** Privacy-respecting telemetry only. Document the endpoint + opt-out env var (`SPECTR_MCP_TELEMETRY=off`) in the README.

**Effort:** S
**Priority:** P2
**Depends on:** A handful of MCP installs to make the data interesting.

## Tuning / Optional

### Tune SPEC_LANE_WORKERS to 3

**What:** Drop `SPEC_LANE_WORKERS` env var on Railway from 4 to 3.

**Why:** The 4-wide parallelism hit the Anthropic 8K OTPM rate limit on section 7 during the DoorDash test run. Existing retry-with-backoff recovered, but if rate-limit retries get noisy, drop to 3.

**Effort:** S (env-only change)
**Priority:** P3

### WebSearch enrichment per spec

**What:** Add one Claude WebSearch tool call per spec to pull current blog posts / articles about the reference app, append to the cached `frontend_spec` prefix.

**Why:** iTunes research enrichment helped framing but is thin. WebSearch adds ~$0.01/spec and meaningfully improves the App Overview section's accuracy.

**Effort:** M
**Priority:** P3
**Depends on:** Decision on whether the marginal quality is worth the cost.

## Completed

<!-- Move items here on completion with: **Completed:** vX.Y.Z (YYYY-MM-DD) -->
