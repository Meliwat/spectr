#!/usr/bin/env python3
"""
Spectr local frame extractor.

Usage:
  python extract.py --mp4 recording.mp4 --app "Duolingo"
  python extract.py --mp4 recording.mp4 --app "Airbnb" --your-app "StayFinder" --max-frames 60

Then drag the output frames/ folder into Claude Code and run /spectr.
"""
import argparse
import os
import sys
import shutil
import tempfile

# Allow running from any directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.ffmpeg import extract_frames
from services.dedup import deduplicate_frames


def main():
    parser = argparse.ArgumentParser(
        description="Extract unique screens from an MP4 for Spectr analysis in Claude Code"
    )
    parser.add_argument("--mp4", required=True, help="Path to the MP4 screen recording")
    parser.add_argument("--app", required=True, help='Reference app name, e.g. "Duolingo"')
    parser.add_argument("--your-app", default=None, help="Your app name (defaults to reference app name)")
    parser.add_argument("--brand-colors", default=None, help='JSON string of brand colors, e.g. \'{"primary":"#FF0000"}\'')
    parser.add_argument("--bundle-id", default=None, help="Bundle ID, e.g. com.yourco.appname")
    parser.add_argument("--out", default=None, help="Output directory (default: ./spectr_<app>/)")
    parser.add_argument("--max-frames", type=int, default=80, help="Max unique frames to keep (default: 80)")
    parser.add_argument("--fps", type=int, default=1, help="Frames per second to extract (default: 1)")
    args = parser.parse_args()

    mp4_path = os.path.abspath(args.mp4)
    if not os.path.exists(mp4_path):
        print(f"\n❌ MP4 not found: {mp4_path}")
        sys.exit(1)

    your_app = args.your_app or args.app
    app_slug = args.app.lower().replace(" ", "_").replace("/", "_")
    out_dir = os.path.abspath(args.out or f"spectr_{app_slug}")
    frames_dir = os.path.join(out_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)

    print(f"\n  Spectr — Local Frame Extractor")
    print(f"  {'─' * 40}")
    print(f"  MP4:        {os.path.basename(mp4_path)}")
    print(f"  App:        {args.app}")
    print(f"  Your app:   {your_app}")
    print(f"  Output:     {out_dir}/")
    print()

    tmpdir = tempfile.mkdtemp(prefix="spectr_extract_")
    try:
        print(f"  [1/3] Extracting frames at {args.fps}fps...", end="", flush=True)
        all_frames = extract_frames(mp4_path, os.path.join(tmpdir, "raw"), fps=args.fps)
        print(f" {len(all_frames)} frames")

        print(f"  [2/3] Deduplicating...", end="", flush=True)
        unique = deduplicate_frames(all_frames)
        print(f" {len(unique)} unique screens")

        if len(unique) > args.max_frames:
            step = len(unique) // args.max_frames
            unique = unique[::step][:args.max_frames]
            print(f"         Trimmed to {len(unique)} (max {args.max_frames})")

        print(f"  [3/3] Copying frames to output...", end="", flush=True)
        # Clear existing frames
        for f in os.listdir(frames_dir):
            os.remove(os.path.join(frames_dir, f))
        for i, src in enumerate(unique):
            dst = os.path.join(frames_dir, f"frame_{i+1:04d}.jpg")
            shutil.copy2(src, dst)
        print(f" done")

    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    # Write metadata file for the slash command to pick up
    meta_lines = [
        f"REFERENCE_APP={args.app}",
        f"YOUR_APP={your_app}",
        f"FRAME_COUNT={len(unique)}",
    ]
    if args.brand_colors:
        meta_lines.append(f"BRAND_COLORS={args.brand_colors}")
    if args.bundle_id:
        meta_lines.append(f"BUNDLE_ID={args.bundle_id}")

    with open(os.path.join(out_dir, ".spectr_meta"), "w") as f:
        f.write("\n".join(meta_lines) + "\n")

    print()
    print(f"  ✓ {len(unique)} frames saved to {frames_dir}/")
    print()
    print(f"  Next steps:")
    print(f"  ─────────────────────────────────────────────")
    print(f"  1. Open Claude Code in this project directory")
    print(f"  2. Drag the entire  {frames_dir}/")
    print(f"     folder into the Claude Code chat")
    print(f"  3. Type:  /spectr")
    print(f"  4. Claude will ask for the app name — answer: {args.app}")
    if your_app != args.app:
        print(f"     Your app name: {your_app}")
    print()
    print(f"  spec.md will be written to your current directory.")
    print()


if __name__ == "__main__":
    main()
