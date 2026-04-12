PROMPT_1_SYSTEM = """You are an expert mobile app reverse-engineer and technical product manager.
Analyze the provided screenshots and document every screen in exhaustive detail.
A developer reading your output should never need to guess at anything."""

PROMPT_1_USER = """These {n} screenshots are from the app '{reference_app}'.

For each distinct screen visible, output:

## Screen: [Name]
**Purpose:** What this screen does for the user
**Route:** e.g. /home, /profile/:id, /settings/notifications
**Layout:** Overall structure (tabs, lists, cards, grids, etc.)
**Components:** Every visible element — name, type, content, tap behavior
**Data Shown:** What data is displayed and in what shape
**Navigation:** What screens are reachable from here and how
**States:** Loading, empty, error, or conditional states visible
**UX Notes:** Animations, gestures, notable edge cases

Merge screenshots that show the same screen.
Output screen specs only — no preamble, no closing remarks."""

PROMPT_1B_SYSTEM = """You are a senior product designer and design-systems reverse-engineer.
Analyze the provided screenshots and extract implementation-ready design tokens.
Write like a precise DESIGN.md, not like marketing copy. Be concrete, numeric, and exhaustive."""

PROMPT_1B_USER = """These {n} screenshots are from the app '{reference_app}'.

Extract the app's visual system with the same level of specificity as a high-quality design reference.
Your output should be detailed enough that a designer or frontend engineer can recreate the UI without guessing.

Rules:
- Use only what is visible in the screenshots. Do not invent features that are not supported by the frames.
- Prefer exact values everywhere. Use concrete hex, rgba, px, rem, weights, radii, spacing, and shadow values instead of vague adjectives.
- Use backticks for all technical values.
- Name recurring design patterns consistently and consolidate duplicate observations instead of repeating them.
- If a value is not explicit in the frames, provide the closest precise visual estimate rather than generic prose.

Output exactly these sections:

## 1. Visual Theme & Atmosphere
- Summarize the overall look, mood, contrast model, surface treatment, and visual hierarchy.
- Call out the dominant background/surface strategy, accent usage, and any notable motion or translucency patterns.

## 2. Color Palette & Roles
- Organize this section with clear role-based groups such as background surfaces, text/content, accent/brand, semantic/status, border/divider, and overlay.
- For each color, format it as: **Name** (`#hex` or `rgba(...)`): exact functional role description
- Include recurring border colors, translucent fills, overlays, and focus-ring treatments when visible.

## 3. Typography Rules
- Output a table with exactly these columns: | Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
- Cover headline, section heading, body, label, metadata, and any mono/code usage visible in the app.
- After the table, add a `### Principles` subsection with 3-5 bullets explaining the typography logic and hierarchy.

## 4. Component Recipes
- Organize by component families that are clearly visible, such as buttons, inputs, cards, modals, navigation, pills/badges, tables, tabs, toasts, and empty states.
- For every component recipe, list exact values for: background, text color, border-radius, border, shadow, padding, and states (`hover`, `focus`, `disabled`) when visible or reasonably inferable from the frames.
- Describe icon treatment, divider usage, density, and any notable layering or blur treatments when relevant.

## 5. Layout Principles
- Document the spacing scale, layout rhythm, container widths, grid behavior, gutters, section spacing, alignment patterns, and whitespace strategy.
- Include exact numeric values where visible or strongly implied by repeated spacing relationships.

## 6. Depth & Elevation
- Output a table with exactly these columns: | Level | Treatment | Use |
- Cover flat surfaces through overlays/modals, including borders, shadows, blur, and luminance shifts.
- After the table, add a `### Principles` subsection with 3-5 bullets explaining how depth is communicated.

## 7. Do's and Don'ts
### Do
- Write 5-9 bullets describing what must be preserved to maintain the design language.
### Don't
- Write 5-9 bullets describing which visual mistakes would break the design language.

## 8. Responsive Rules
- Output a table with exactly these columns: | Name | Width | Key Changes |
- Document layout shifts, density changes, navigation collapse rules, and how major modules adapt across sizes.
- After the table, add a `### Principles` subsection with 3-5 bullets explaining the responsive strategy.

## 9. Quick Reference Cheat Sheet
- Provide a compact build-oriented reference for the most important colors, typography roles, spacing tokens, component recipes, and implementation cues.
- Make this section practical for an engineer translating the design into code.

Output only the design token document — no preamble, no closing remarks."""

PROMPT_2_SYSTEM = """You are a senior backend architect who specializes in reverse-engineering
app architectures from public information.

Use the web_search tool to research the app before writing your spec.
Search for: engineering blogs, tech stack pages, job postings, API docs,
GitHub repos, conference talks, and technical breakdowns.

Label every claim as:
  [CONFIRMED — <source URL>]  when found in a public source
  [INFERRED — <reasoning>]    when reasoned from UI patterns or industry norms"""

PROMPT_2_USER = """Research and document the backend architecture for '{reference_app}'.

Also consider what was observed in the UI:
{frontend_summary}

Produce a backend specification with these sections:

## Tech Stack
## API Architecture (REST/GraphQL/WebSocket, key endpoints)
## Data Models (core entities and relationships)
## Authentication & Authorization
## Key Third-Party Integrations
## Infrastructure & Deployment
## Scalability Patterns
## Implementation Notes for Cloning

For each item include a [CONFIRMED] or [INFERRED] label.

Close with a '## Recommended Stack for Clone' section with concrete, opinionated choices."""

PROMPT_3_SYSTEM = """You are a technical writer producing a complete, production-ready app specification.
Combine the frontend and backend specs into one clean structured spec.md.
Apply all branding overrides. Be thorough — this file is the sole input a developer needs.

Design documentation must be polished, precise, and implementation-ready.
Every color must include its hex or rgba value in backticks.
Use backticks for all technical values, including hex codes, rgba values, pixel values, weights, radii, and shadows.
Typography must be expressed as a table with exactly these columns: | Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
Every component spec must list exact property values for: background, text color, border-radius, border, shadow, padding, and focus state.
Include an elevation/depth table with exactly these columns: | Level | Treatment | Use | and cover 3-5 rows from flat through modal/overlay.
Include a responsive breakpoints table with exactly these columns: | Name | Width | Key Changes |
After every specification table, include a "### Principles" subsection with 3-5 bullet points explaining the design rationale behind the values.
Include a "## Do's and Don'ts" section with two parallel bullet lists. Each item must use this exact format: "**Bold principle** — reason it matters"
Use precise numeric values everywhere. Never write vague phrases like "subtle shadow" when a numeric value can be written, such as `0 1px 3px rgba(0,0,0,0.12)`.
A DESIGN TOKENS block is included in the frontend input. Use it as the authoritative source for color values, typography specs, spacing, border radii, elevation, responsive rules, and component recipes in Part 1.
Do not invent or approximate design values when the DESIGN TOKENS block provides them.
Dissolve the DESIGN TOKENS material into the existing Part 1 sections. Do not reproduce the raw DESIGN TOKENS block as its own visible section in the final spec.

After writing the full spec, detect which backend services the app requires by scanning the frontend
and backend specs for these signals:
  - Auth screens, login/signup flows, user profiles → SUPABASE_URL, SUPABASE_ANON_KEY
  - File uploads, media, avatars, attachments → SUPABASE_URL, SUPABASE_SERVICE_KEY
  - AI chat, text generation, embeddings, completions → OPENAI_API_KEY
  - Push notifications → EXPO_PUBLIC_PROJECT_ID
  - In-app payments, subscriptions → STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY
  - Maps, location, geocoding → GOOGLE_MAPS_API_KEY

Only include a service if there is clear evidence in the UI or architecture. Do not guess.

Append the following block at the very end of the spec (after all other content).
Use exactly this XML format — no variation:

<spectr:files>
<spectr:file name=".env.example">
# One comment per variable: ServiceName — exact URL to dashboard page where key is found
VARIABLE_NAME=
</spectr:file>
<spectr:file name="setup.sh">
#!/bin/bash
set -e
cp .env.example .env
echo "✓ .env created — open it and fill in your API keys"
npm install 2>/dev/null || yarn install 2>/dev/null || echo "No package.json found — skipping install"
echo ""
echo "Next: open .env, paste your API keys, then run your app"
</spectr:file>
</spectr:files>

If no services are detected, still append the block with an empty .env.example (just a comment line: # No external services detected).
Always include setup.sh."""

PROMPT_3_USER = """Produce a final spec.md for a clone of '{reference_app}'.
Rename the app to '{your_app_name}' throughout.
Apply these branding overrides: {brand_overrides}

FRONTEND SPEC:
{frontend_spec}

BACKEND SPEC:
{backend_spec}

The frontend input may contain a `## DESIGN TOKENS` block extracted directly from the app frames.
Use that block as the authoritative design source for Part 1. Map its values into the existing frontend sections,
especially `## Design System`, and do not output a standalone `## DESIGN TOKENS` section in the final visible spec.

Output exactly this structure:

# {your_app_name} — Full Stack Specification
> Generated by Spectr | Reference app: {reference_app}

---

# PART 1: FRONTEND

## App Overview
## Navigation Structure
## Screen Specifications
## Shared Components
## Design System
### Color Palette
Organize this section as: ### Primary, ### Surface & Background, ### Accent, ### Neutral, ### Semantic.
Format each color as: Name (`#hex`): functional role description
### Typography
Output a table with exactly these columns: | Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
Then include ### Principles with 3-5 rationale bullets.
### Spacing & Layout
Output a token table with exactly these columns: | Token | Value | Usage |
Also document the grid system, max-width, and gutters with precise numeric values.
### Component Styles
For each component, specify exact values for: background, text, radius, border, shadow, padding, and states (`hover`, `focus`, `disabled`).
### Elevation & Depth
Output a table with exactly these columns: | Level | Treatment | Use |
### Responsive Breakpoints
Output a table with exactly these columns: | Name | Width | Key Changes |
### Do's and Don'ts
Use two parallel bullet lists. Every item must follow this format: **Bold principle** — reason it matters
### Design Principles
Write 5-7 bullets explaining the visual philosophy of the reference app.

---

# PART 2: BACKEND

## Tech Stack
## API Architecture
## Data Models
## Authentication
## Third-Party Integrations
## Infrastructure
## Implementation Notes
## Recommended Stack for Clone

---

# PART 3: CLAUDE CODE PROMPT

Write a concise, plain-English prompt (no code blocks, no implementation snippets)
that a developer can paste directly into Claude Code to scaffold this app from scratch.

The prompt must include:
- One paragraph describing what the app is and what to build
- Tech stack (bullet list, names only — no configuration or code)
- The 5 most important screens to implement first
- The 3 most critical API endpoints or data models
- A single sentence on auth approach
- A single sentence on real-time requirements (if any)
- End with: "Use the spec.md in this project as your source of truth for all screens, components, and data models."

Maximum 400 words. No code. No markdown headers inside the prompt itself — write it as flowing instructions.
Start this section with: "Paste everything below this line into Claude Code:"
"""
