MOBILE_VIEW_MODEL_SYSTEM = """You generate the UI-facing data contract for an Expo Router mobile scaffold.
Output only one <spectr:file> block for `src/lib/view-models.ts`.
The file must compile, work in demo mode when Supabase env vars are absent, and only use the provided fixed runtime helpers.
Do not add prose or TODO comments."""

MOBILE_VIEW_MODEL_USER = """Generate `src/lib/view-models.ts` for the app '{your_app_name}' (reference app: '{reference_app}').

This file is the only UI-facing data contract for generated screens.

Rules:
- Screens will import from `@/src/lib/view-models` only. Do not require screens to import raw `src/lib/types.ts`.
- Use `listRows`, `getRow`, and `dataMode` from `src/lib/data.ts` for data loading.
- You may import raw table row types from `src/lib/types.ts` inside this file when needed.
- Export stable UI-facing interfaces and loader functions for each route in the manifest.
- Prefer one screen data interface and one loader function per route.
- Loader functions must keep demo mode working with no Supabase env vars present.
- Export only route-facing contracts; do not create unrelated helpers.

## Available Scaffold API (do not invent anything outside this)
{scaffold_api}

Route manifest:
{route_manifest}

Structured screens:
{screen_analysis_json}

Design tokens:
{design_tokens}

Canonical schema:
{canonical_schema}

TypeScript data contract:
{typescript_contract}

Output only:
<spectr:files>
<spectr:file path="src/lib/view-models.ts">
...file contents...
</spectr:file>
</spectr:files>"""


MOBILE_FRONTEND_SYSTEM = """You generate one Expo Router route at a time for a reverse-engineered mobile app.
Output only <spectr:file> blocks for the assigned route file and optional route-private files under `src/features/<route_key>/...`.
Every file must compile, use only React Native / Expo Router APIs, and work in demo mode when Supabase env vars are absent.
Do not use web-only APIs. Do not regenerate scaffold-owned files. Do not add prose or TODO comments."""

MOBILE_FRONTEND_USER = """Generate the route implementation for `{route_file}` in the app '{your_app_name}' (reference app: '{reference_app}').

You are generating exactly one route target:
- Route file: `{route_file}`
- Route path: `{route_path}`
- Route key: `{route_key}`
- Route params: {route_params}

Allowed outputs:
- `{route_file}`
- files under `src/features/{route_key}/...`

Forbidden outputs:
- anything under `src/components/`
- anything under `src/lib/` except the existing `src/lib/view-models.ts` generated earlier
- any scaffold-owned file shown in the API block below

Hard rules:
- Import scaffold-owned files with the `@/` alias, not relative `../src/...` paths.
- Use only the shared component props, helper signatures, routes, and token names listed below.
- Route files must import loader functions and UI-facing types from `@/src/lib/view-models`.
- Route files may import route-private components only from `@/src/features/{route_key}/...`.
- Do not import raw `src/lib/types.ts` or `src/lib/data.ts` from route files.
- Keep the screen visually polished and specific to the provided design tokens.

## Available Scaffold API (do not invent anything outside this)
{scaffold_api}

## View-Model Contract
{view_model_contract}

Route manifest:
{route_manifest}

Structured screen for this route:
{route_screen_json}

Design tokens:
{design_tokens}

Canonical schema:
{canonical_schema}

Output only file blocks."""
