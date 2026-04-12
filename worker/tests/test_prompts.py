from prompts import PROMPT_3_SYSTEM, PROMPT_3_USER


def test_prompt_3_system_uses_design_tokens_as_authoritative_source():
    assert "A DESIGN TOKENS block is included in the frontend input." in PROMPT_3_SYSTEM
    assert "Use it as the authoritative source" in PROMPT_3_SYSTEM
    assert "Do not reproduce the raw DESIGN TOKENS block" in PROMPT_3_SYSTEM


def test_prompt_3_user_consumes_design_tokens_without_visible_section():
    assert "The frontend input may contain a `## DESIGN TOKENS` block" in PROMPT_3_USER
    assert "do not output a standalone `## DESIGN TOKENS` section" in PROMPT_3_USER
    assert "\n## DESIGN TOKENS\n" not in PROMPT_3_USER
