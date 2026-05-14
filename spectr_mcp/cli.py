"""Spectr CLI — standalone command-line entry point.

Takes a screen recording (MP4/MOV/M4V), runs the Spectr pipeline,
writes spec.md to disk. Same pipeline as the MCP server; no AI agent
required to invoke it. Good for scripting, CI, batch jobs, or just
preferring a CLI over chat.

Uses the user's Claude subscription via the `claude` CLI when available,
or ANTHROPIC_API_KEY when set. No Spectr-side API key. No upload.

Usage:
    spectr-cli generate ./recording.mp4 --app "Duolingo"
    spectr-cli generate ./rec.mov --app "Spotify" --output ./specs/spotify.md
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
import time
from pathlib import Path

from .pipeline import generate_spec as _generate_spec_impl

log = logging.getLogger("spectr-cli")


def _cmd_generate(args: argparse.Namespace) -> int:
    """Run the spec generation pipeline against a screen recording."""
    source = Path(args.source).expanduser().resolve()
    if not source.exists():
        print(f"error: file not found: {source}", file=sys.stderr)
        return 2
    if not source.is_file():
        print(f"error: not a file: {source}", file=sys.stderr)
        return 2

    brand_colors = None
    if args.brand_colors:
        import json
        try:
            brand_colors = json.loads(args.brand_colors)
        except json.JSONDecodeError as e:
            print(f"error: --brand-colors is not valid JSON: {e}", file=sys.stderr)
            return 2

    output_path = Path(args.output).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(
        f"spectr: generating spec from {source.name} for {args.app!r}...",
        file=sys.stderr,
    )
    print(
        "spectr: this takes 2–4 minutes. running vision passes + spec sections.",
        file=sys.stderr,
    )

    start = time.time()
    try:
        spec_md = _generate_spec_impl(
            str(source),
            reference_app=args.app,
            your_app_name=args.your_app,
            brand_colors=brand_colors,
            max_frames=args.max_frames,
        )
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    except Exception as e:
        log.exception("generate_spec failed")
        print(f"error: pipeline failed: {e}", file=sys.stderr)
        return 1
    elapsed = time.time() - start

    output_path.write_text(spec_md, encoding="utf-8")
    section_count = spec_md.count("\n## ")
    print(
        f"spectr: wrote {output_path} ({len(spec_md):,} chars, {section_count} sections, "
        f"elapsed={elapsed:.1f}s).",
        file=sys.stderr,
    )
    return 0


def main(argv: list[str] | None = None) -> int:
    """Entrypoint for the `spectr-cli` console script."""
    logging.basicConfig(
        level=os.getenv("SPECTR_CLI_LOG_LEVEL", "WARNING"),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        stream=sys.stderr,
    )

    parser = argparse.ArgumentParser(
        prog="spectr-cli",
        description="Turn a screen recording into a production-ready spec.md.",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_gen = sub.add_parser(
        "generate",
        help="Generate a spec.md from a screen recording",
        description=(
            "Run the Spectr pipeline against a local screen recording. "
            "Outputs a 7-section markdown spec ready for Claude Code."
        ),
    )
    p_gen.add_argument(
        "source",
        help="Path to a screen recording (.mp4, .mov, or .m4v).",
    )
    p_gen.add_argument(
        "--app",
        required=True,
        help='Name of the app shown in the recording (e.g. "Duolingo").',
    )
    p_gen.add_argument(
        "--your-app",
        default=None,
        help='Name of the clone you are building. Defaults to --app.',
    )
    p_gen.add_argument(
        "--brand-colors",
        default=None,
        help='JSON object of brand overrides (e.g. \'{"primary":"#FF5722"}\').',
    )
    p_gen.add_argument(
        "--max-frames",
        type=int,
        default=20,
        help="Cap on frames sent to vision analysis (default: 20).",
    )
    p_gen.add_argument(
        "-o", "--output",
        default="./spec.md",
        help="Where to write the spec.md (default: ./spec.md).",
    )
    p_gen.set_defaults(func=_cmd_generate)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
