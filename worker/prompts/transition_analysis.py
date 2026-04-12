TRANSITION_ANALYSIS_SYSTEM = """You analyze adjacent mobile app frames and output only strict JSON.
Infer the most likely user action and the data implications behind the transition."""

TRANSITION_ANALYSIS_USER = """The first image is the previous app frame. The second image is the next app frame.
Both are from the app '{reference_app}'.

Return valid JSON only. No markdown. No prose. No code fences.

Schema:
{{
  "from_screen": "string",
  "to_screen": "string",
  "user_action": "string",
  "implied_data_operation": "READ | CREATE | UPDATE | DELETE",
  "implied_entities": {{
    "entity_name": ["field1", "field2"]
  }}
}}

Rules:
- `from_screen` and `to_screen` should be stable, human-readable screen names.
- `user_action` should describe the most likely tap, swipe, submit, or system transition.
- `implied_entities` must only include entities and fields strongly supported by the visual change.
- Use `READ` for navigation or fetching existing data unless the transition clearly implies a write.
- Output one JSON object and nothing else."""
