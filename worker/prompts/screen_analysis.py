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

SCREEN_JSON_SYSTEM = """You are a mobile app analyst producing strict machine-readable output.
Study the screenshots and return only valid JSON that matches the required schema."""

SCREEN_JSON_USER = """These {n} screenshots are from the app '{reference_app}'.

Return valid JSON only. Do not use markdown. Do not wrap the JSON in code fences.

Schema:
{{
  "screens": [
    {{
      "name": "string",
      "route": "string",
      "purpose": "string",
      "states": ["string"],
      "actions": ["string"],
      "visible_entities": {{
        "entity_name": ["field_name"]
      }}
    }}
  ]
}}

Rules:
- Merge screenshots that show the same screen.
- Always include at least one screen object.
- Prefer stable route shapes such as `/`, `/profile`, `/orders/[id]`, `/settings/notifications`.
- `visible_entities` should only list entities and fields that are strongly implied by visible UI.
- Use concise strings. No prose outside the JSON object."""
