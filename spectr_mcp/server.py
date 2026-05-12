"""MCP server exposing Spectr's spec generator as a tool.

Two transports:

- **stdio** (default) — local-only. Launched by an MCP client (Claude Code,
  Cursor, etc.) as a subprocess. `spectr-mcp` console script with no args.

- **streamable-http** — hosted. Lets users add Spectr to Claude via the web
  app's "Settings → Connectors → Add a custom connector" flow with the
  server URL. `spectr-mcp --http` or set `SPECTR_MCP_HTTP=1`. Reads `$PORT`
  for the listen port (Railway / Heroku / Fly convention).
"""

from __future__ import annotations

import argparse
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
    reference_app: str,
    your_app_name: Optional[str] = None,
    brand_colors: Optional[dict] = None,
    max_frames: int = 20,
    output_path: Optional[str] = None,
) -> str:
    """Generate a production-ready spec.md from a screen recording.

    The spec is a structured 7-section markdown document (~80-150KB) covering
    app overview, navigation architecture, screen specifications, component
    library, design system (with exact hex/px/weight values), implementation
    notes, and a Claude Code prompt the developer can paste to build the clone.
    Targets Expo SDK 54 / React Native / iPhone 15 baseline.

    Pipeline runs on the user's Claude subscription via the `claude` CLI by
    default (no API key needed). If ANTHROPIC_API_KEY is set in the env,
    uses the SDK path instead. Typical run: 5–10 min per MP4.

    Args:
        source: Absolute path to a local screen recording. Accepted formats:
            .mp4, .mov, .m4v. Anything you can phone-mirror / simulator-
            capture / desktop-record works. The pipeline extracts unique
            frames via ffmpeg scene-change detection + perceptual-hash
            dedup, so a 5-minute recording yields ~15-25 unique frames.
        reference_app: Display name of the app the recording shows.
            REQUIRED — the spec uses it for section headings, navigation
            anchor names, and the Claude Code build prompt.
        your_app_name: Name of the clone the developer is building.
            Defaults to reference_app.
        brand_colors: Optional dict of brand color overrides (e.g.
            {"primary": "#FF5722"}). Tells the spec to bias toward these
            values instead of the source app's palette.
        max_frames: Cap on frames sent to vision analysis. Default 20
            (covers most app flows cleanly). Raise to 30-48 for complex
            apps with many distinct screens; each +10 frames roughly
            +50% vision cost.
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
    """Entrypoint for the `spectr-mcp` console script.

    Detects transport via flag or env:
      - `--http` flag OR `SPECTR_MCP_HTTP=1` env var → streamable-http on $PORT
      - otherwise → stdio (local subprocess launched by an MCP client)
    """
    parser = argparse.ArgumentParser(description="Spectr MCP server")
    parser.add_argument(
        "--http",
        action="store_true",
        help="Run the streamable-http transport instead of stdio. Required for hosted deployments where Claude / Cursor / Codex add the server as a remote connector URL.",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("PORT", "8000")),
        help="Port to bind in --http mode. Defaults to $PORT (Railway / Heroku convention) or 8000.",
    )
    parser.add_argument(
        "--host",
        default=os.getenv("HOST", "0.0.0.0"),
        help="Interface to bind in --http mode. Defaults to 0.0.0.0 (all interfaces).",
    )
    args, _ = parser.parse_known_args()

    use_http = args.http or os.getenv("SPECTR_MCP_HTTP", "").lower() in ("1", "true", "yes")

    if use_http:
        # streamable-http transport: exposes an HTTP endpoint that MCP clients
        # connect to via the "Add a custom connector" flow in Claude.
        log.info("Starting Spectr MCP (streamable-http) on %s:%d", args.host, args.port)
        mcp.settings.host = args.host
        mcp.settings.port = args.port
        mcp.run(transport="streamable-http")
    else:
        # stdio: launched as subprocess by the client. No host/port involved.
        log.info("Starting Spectr MCP (stdio)")
        mcp.run()


if __name__ == "__main__":
    main()
