"""MCP stdio server exposing Spectr's spec generator as a tool.

Run via the `spectr-mcp` console script (configured in pyproject.toml).
Typically launched by an MCP client (Claude Code, Cursor, etc.) and not
invoked directly.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from pathlib import Path
from typing import Optional

from mcp.server.fastmcp import FastMCP

from .pipeline import generate_spec as _generate_spec_impl

# stdout is reserved for MCP protocol traffic — log to stderr only.
logging.basicConfig(
    level=os.getenv("SPECTR_MCP_LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger("spectr-mcp")

mcp = FastMCP("spectr")


@mcp.tool()
async def generate_spec(
    source: str,
    reference_app: Optional[str] = None,
    your_app_name: Optional[str] = None,
    brand_colors: Optional[dict] = None,
    max_frames: int = 20,
    output_path: Optional[str] = None,
) -> str:
    """Generate a production-ready spec.md from an App Store URL or local MP4.

    The spec is a structured 7-section markdown document (~80-150KB) covering
    app overview, navigation architecture, screen specifications, component
    library, design system (with exact hex/px/weight values), implementation
    notes, and a Claude Code prompt the developer can paste to build the clone.
    Targets Expo SDK 54 / React Native / iPhone 15 baseline.

    Pipeline cost is billed to the caller's ANTHROPIC_API_KEY. Typical run:
    2-5 min for App Store URLs, 5-10 min for MP4 recordings.

    Args:
        source: One of:
            - An App Store URL (https://apps.apple.com/us/app/.../id123456789)
            - A bare app id ("id123456789" or "123456789")
            - An absolute path to a local MP4 screen recording.
          App Store URLs use 5-10 screenshots Apple already published.
          MP4 paths use up to 48 deduplicated frames from the recording.
        reference_app: Display name of the source app. Auto-detected from
            App Store metadata when source is a URL. REQUIRED for MP4 input.
        your_app_name: Name of the clone the developer is building. Defaults
            to reference_app.
        brand_colors: Optional dict of brand color overrides (e.g.
            {"primary": "#FF5722"}). Tells the spec to bias toward these
            values instead of the source app's palette.
        max_frames: Cap on frames sent to vision analysis. Default 20 (matches
            Spectr's hosted production setting — covers most apps cleanly).
            Raise to 30-48 for complex apps with many distinct screens; each
            +10 frames roughly +50% vision cost.
        output_path: Optional absolute path to write the spec.md to. If
            provided, the tool writes the file and returns a short summary
            (recommended — keeps the calling LLM's context window small).
            If omitted, returns the full ~80-150KB spec content inline.

    Returns:
        Either the full spec.md content (if no output_path) or a short
        confirmation summary (if output_path was written successfully).
    """
    # Run the synchronous, long-running pipeline off the asyncio event loop so
    # MCP heartbeats and concurrent tool calls keep flowing during the 2-10 min
    # spec generation.
    try:
        spec_md = await asyncio.to_thread(
            _generate_spec_impl,
            source,
            reference_app=reference_app,
            your_app_name=your_app_name,
            brand_colors=brand_colors,
            max_frames=max_frames,
        )
    except ValueError as e:
        return f"Invalid input: {e}"
    except Exception as e:
        log.exception("generate_spec failed")
        return f"Pipeline failed: {e}"

    if output_path:
        try:
            out = Path(output_path).expanduser().resolve()
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(spec_md, encoding="utf-8")
            return (
                f"Spec written to {out} "
                f"({len(spec_md):,} chars, {spec_md.count(chr(10) + '## '):d} top-level sections)."
            )
        except Exception as e:
            return (
                f"Spec generated ({len(spec_md):,} chars) but failed to write to "
                f"{output_path}: {e}\n\n{spec_md}"
            )

    return spec_md


def main() -> None:
    """Entrypoint for the `spectr-mcp` console script."""
    mcp.run()


if __name__ == "__main__":
    main()
