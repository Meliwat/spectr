import os
import base64
import anthropic
from prompts import (
    PROMPT_1_SYSTEM, PROMPT_1_USER,
    PROMPT_2_SYSTEM, PROMPT_2_USER,
    PROMPT_3_SYSTEM, PROMPT_3_USER,
)


def _client():
    return anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def analyze_frames_batch(frame_paths: list[str], reference_app: str) -> str:
    content = []
    for path in frame_paths:
        with open(path, "rb") as f:
            data = base64.b64encode(f.read()).decode()
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": data},
        })
    content.append({
        "type": "text",
        "text": PROMPT_1_USER.format(n=len(frame_paths), reference_app=reference_app),
    })
    res = _client().messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=PROMPT_1_SYSTEM,
        messages=[{"role": "user", "content": content}],
    )
    return res.content[0].text


def research_backend(reference_app: str, frontend_summary: str) -> str:
    res = _client().messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        tools=[{"type": "web_search_20250305", "name": "web_search"}],
        system=PROMPT_2_SYSTEM,
        messages=[{
            "role": "user",
            "content": PROMPT_2_USER.format(
                reference_app=reference_app,
                frontend_summary=frontend_summary,
            ),
        }],
    )
    return "".join(b.text for b in res.content if b.type == "text")


def stitch_spec(
    reference_app: str,
    your_app_name: str,
    brand_overrides: str,
    frontend_spec: str,
    backend_spec: str,
) -> str:
    res = _client().messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8192,
        system=PROMPT_3_SYSTEM,
        messages=[{
            "role": "user",
            "content": PROMPT_3_USER.format(
                reference_app=reference_app,
                your_app_name=your_app_name,
                brand_overrides=brand_overrides,
                frontend_spec=frontend_spec,
                backend_spec=backend_spec,
            ),
        }],
    )
    return res.content[0].text
