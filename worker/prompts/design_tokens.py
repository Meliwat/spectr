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

