from prompts import (
    PROMPT_3_SYSTEM,
    PROMPT_3_USER,
    SPEC_SECTION_SYSTEM,
    SPEC_SECTION_DEFINITIONS,
    build_spec_section_prompt,
    SCREEN_JSON_USER,
    TRANSITION_ANALYSIS_USER,
    MOBILE_FRONTEND_SYSTEM,
    MOBILE_FRONTEND_USER,
    MOBILE_VIEW_MODEL_SYSTEM,
    MOBILE_VIEW_MODEL_USER,
    MOBILE_REPAIR_USER,
)


def test_prompt_3_system_uses_design_tokens_as_authoritative_source():
    assert "A DESIGN TOKENS block is included in the frontend input." in PROMPT_3_SYSTEM
    assert "Use it as the authoritative source" in PROMPT_3_SYSTEM
    assert "Do not reproduce the raw DESIGN TOKENS block" in PROMPT_3_SYSTEM
    assert "SVG icons or SVG" in PROMPT_3_SYSTEM
    assert "React Native mobile app" in PROMPT_3_SYSTEM


def test_prompt_3_user_consumes_design_tokens_without_visible_section():
    assert "The frontend input may contain a `## DESIGN TOKENS` block" in PROMPT_3_USER
    assert "do not output a standalone `## DESIGN TOKENS` section" in PROMPT_3_USER
    assert "local SVG" in PROMPT_3_USER
    assert "React Native mobile app for phones" in PROMPT_3_USER
    assert "\n## DESIGN TOKENS\n" not in PROMPT_3_USER


def test_sectioned_spec_prompts_cover_every_top_level_section():
    assert len(SPEC_SECTION_DEFINITIONS) == 7
    headings = [section["top_level_headings"][0] for section in SPEC_SECTION_DEFINITIONS]
    assert headings == [
        "## App Overview",
        "## Navigation Structure",
        "## Screen Specifications",
        "## Shared Components",
        "## Design System",
        "## Frontend Implementation Notes",
        "## Claude Code Prompt",
    ]


def test_section_prompt_builder_restricts_top_level_headings():
    shared_components = next(section for section in SPEC_SECTION_DEFINITIONS if section["key"] == "shared_components")
    prompt = build_spec_section_prompt(
        section=shared_components,
        reference_app="DoorDash",
        your_app_name="MyApp",
        brand_overrides="None provided",
        frontend_spec="## DESIGN TOKENS\n- token",
    )
    assert "Do not output the document title." in prompt
    assert "Do not output any top-level `##` sections" in prompt
    assert "## Shared Components" in prompt
    assert "### 1." in prompt


def test_section_system_uses_design_tokens_as_authoritative_source():
    assert "A DESIGN TOKENS block is included in the frontend input." in SPEC_SECTION_SYSTEM
    assert "Use it as the authoritative source" in SPEC_SECTION_SYSTEM
    assert "Do not include any other top-level `##` sections." in SPEC_SECTION_SYSTEM
    assert "SVG icons or SVG" in SPEC_SECTION_SYSTEM
    assert "React Native mobile app" in SPEC_SECTION_SYSTEM


def test_transition_prompt_requires_json_only():
    assert "Return valid JSON only" in TRANSITION_ANALYSIS_USER
    assert "No markdown" in TRANSITION_ANALYSIS_USER
    assert "READ | CREATE | UPDATE | DELETE" in TRANSITION_ANALYSIS_USER


def test_structured_prompts_can_be_formatted_without_key_errors():
    rendered_screen = SCREEN_JSON_USER.format(n=2, reference_app="DoorDash")
    rendered_transition = TRANSITION_ANALYSIS_USER.format(reference_app="DoorDash")
    assert '"screens"' in rendered_screen
    assert '"from_screen"' in rendered_transition


def test_mobile_frontend_prompt_forbids_web_only_behavior():
    assert "demo mode" in MOBILE_FRONTEND_SYSTEM
    assert "Do not use web-only APIs" in MOBILE_FRONTEND_SYSTEM
    assert "Expo Router" in MOBILE_FRONTEND_SYSTEM
    assert "src/features/{route_key}" in MOBILE_FRONTEND_USER
    assert "Import scaffold-owned files with the `@/` alias" in MOBILE_FRONTEND_USER
    assert "src/lib/view-models" in MOBILE_FRONTEND_USER


def test_mobile_view_model_prompt_requires_ui_facing_contract():
    assert "UI-facing data contract" in MOBILE_VIEW_MODEL_SYSTEM
    assert "Generate `src/lib/view-models.ts`" in MOBILE_VIEW_MODEL_USER
    assert "Screens will import from `@/src/lib/view-models` only." in MOBILE_VIEW_MODEL_USER
    assert "Available Scaffold API" in MOBILE_VIEW_MODEL_USER


def test_mobile_repair_prompt_limits_scope():
    assert "Fix only the files listed below" in MOBILE_REPAIR_USER
    assert "Available Scaffold API" in MOBILE_REPAIR_USER
    assert "src/lib/view-models" in MOBILE_REPAIR_USER
