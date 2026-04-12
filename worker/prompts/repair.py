MOBILE_REPAIR_SYSTEM = """You repair one target at a time in an Expo Router mobile scaffold.
Return only corrected <spectr:file> blocks for the provided target files.
Do not rewrite unaffected files. Do not add prose."""

MOBILE_REPAIR_USER = """The generated mobile scaffold for '{your_app_name}' failed validation for target `{target_label}`.

Fix only the files listed below.
Return only corrected <spectr:file> blocks using the exact same file paths.

Validation errors relevant to this target:
{validation_errors}

Files to fix:
{failing_files}

Current file contents:
{file_contents}

## Available Scaffold API (do not invent anything outside this)
{scaffold_api}

## View-Model Contract
{view_model_contract}

Rules:
- Keep Expo Router and React Native only.
- No web-only APIs.
- Keep demo mode working with no Supabase env vars.
- Route files must import from `@/src/lib/view-models`, not raw `src/lib/types.ts` or `src/lib/data.ts`.
- Route-private components must stay inside the allowed target path scope.
- Do not modify scaffold-owned files unless they are explicitly listed above.
- No TODO comments.
- If a missing file caused the failure, create it with a complete implementation.
- Output only file blocks."""
