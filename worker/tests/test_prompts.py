from prompts import (
    PROMPT_3_SYSTEM,
    PROMPT_3_USER,
    SPEC_SECTION_SYSTEM,
    SPEC_SECTION_DEFINITIONS,
    build_spec_section_prompt,
)


def test_prompt_3_system_uses_design_tokens_as_authoritative_source():
    assert "A DESIGN TOKENS block is included in the frontend input." in PROMPT_3_SYSTEM
    assert "Use it as the authoritative source" in PROMPT_3_SYSTEM
    assert "Do not reproduce the raw DESIGN TOKENS block" in PROMPT_3_SYSTEM
    assert "SVG icons or SVG" in PROMPT_3_SYSTEM
    assert "React Native mobile app" in PROMPT_3_SYSTEM
    assert "Expo SDK 54" in PROMPT_3_SYSTEM
    assert "Expo Go compatibility" in PROMPT_3_SYSTEM
    assert "npx expo install" in PROMPT_3_SYSTEM
    assert "iPhone 15" in PROMPT_3_SYSTEM
    assert "merchant logos" in PROMPT_3_SYSTEM


def test_prompt_3_user_consumes_design_tokens_without_visible_section():
    assert "The frontend input may contain a `## DESIGN TOKENS` block" in PROMPT_3_USER
    assert "do not output a standalone `## DESIGN TOKENS` section" in PROMPT_3_USER
    assert "local SVG" in PROMPT_3_USER
    assert "React Native mobile app for phones" in PROMPT_3_USER
    assert "Expo SDK 54" in PROMPT_3_USER
    assert "React Navigation" in PROMPT_3_USER
    assert "Zustand" in PROMPT_3_USER
    assert "react-native-svg" in PROMPT_3_USER
    assert "npx expo install" in PROMPT_3_USER
    assert "iPhone 15" in PROMPT_3_USER
    assert "merchant logos" in PROMPT_3_USER
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
    assert "Expo SDK 54" in SPEC_SECTION_SYSTEM
    assert "Expo Go compatibility" in SPEC_SECTION_SYSTEM
    assert "npx expo install" in SPEC_SECTION_SYSTEM
    assert "iPhone 15" in SPEC_SECTION_SYSTEM
    assert "merchant logos" in SPEC_SECTION_SYSTEM


def test_spec_sections_require_expo_and_branding_constraints():
    app_overview = next(section for section in SPEC_SECTION_DEFINITIONS if section["key"] == "app_overview")
    implementation_notes = next(section for section in SPEC_SECTION_DEFINITIONS if section["key"] == "implementation_notes")
    claude_code_prompt = next(section for section in SPEC_SECTION_DEFINITIONS if section["key"] == "claude_code_prompt")

    assert "iPhone 15" in app_overview["required_substrings"]
    assert "Expo SDK 54" in implementation_notes["required_substrings"]
    assert "Expo Go" in implementation_notes["required_substrings"]
    assert "merchant logos" in implementation_notes["required_substrings"]
    assert "Expo SDK 54" in claude_code_prompt["required_substrings"]
    assert "react-native-svg" in claude_code_prompt["required_substrings"]
    assert "npx expo install" in claude_code_prompt["required_substrings"]

