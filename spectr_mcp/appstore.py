"""App Store URL → local screenshot files.

Mirrors the TS implementation in frontend/app/api/projects/gallery/route.ts.
The iTunes Lookup API increasingly returns empty screenshot arrays for popular
apps (DoorDash, Instagram, Spotify all empty as of 2026), so we fall back to
scraping the App Store page HTML for mzstatic.com URLs. Brittle vs. Apple's
HTML format changes — if it breaks, look at the regex first.
"""

from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

import requests

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 spectr-mcp/0.1"
)

_HTML_SCREENSHOT_PATTERN = re.compile(
    r"https://[a-z0-9-]+\.mzstatic\.com/image/thumb/[^\"\s]+?/"
    r"AppStore-iPhone[\d.]+-Screen-\d+\.png"
)

_MZSTATIC_SIZE_SUFFIX = "/1290x2796bb.png"  # iPhone 6.9" full-res


def parse_app_store_url(url: str) -> tuple[str, str]:
    """Return (app_id, country) from an App Store URL.

    Accepts:
      - https://apps.apple.com/us/app/doordash/id719972451
      - https://apps.apple.com/gb/app/.../id123456?mt=8
      - id123456
      - 123456

    Raises ValueError if no app id can be extracted.
    """
    s = (url or "").strip()
    if not s:
        raise ValueError("Empty App Store URL")

    m = re.search(r"id(\d+)", s) or re.match(r"^(\d+)$", s)
    if not m:
        raise ValueError(f"Could not extract app id from {s!r}")
    app_id = m.group(1)

    country_match = re.search(r"apps\.apple\.com/([a-z]{2})/", s, flags=re.I)
    country = country_match.group(1).lower() if country_match else "us"
    return app_id, country


def fetch_screenshot_urls_via_lookup(
    app_id: str, country: str
) -> tuple[list[str], Optional[str]]:
    """Try iTunes Lookup API. Returns (urls, app_name) — urls may be empty."""
    try:
        r = requests.get(
            "https://itunes.apple.com/lookup",
            params={"id": app_id, "country": country},
            headers={"User-Agent": "spectr-mcp/0.1"},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
    except Exception:
        return [], None

    results = data.get("results") or []
    if not results:
        return [], None
    app = results[0]
    name = app.get("trackName")
    iphone = app.get("screenshotUrls") or []
    ipad = app.get("ipadScreenshotUrls") or []
    urls = (iphone if iphone else ipad)[:20]
    return urls, name


def scrape_screenshot_urls_via_html(page_url: str) -> list[str]:
    """Fallback: scrape AppStore-iPhone*-Screen-NN.png URLs from the page HTML."""
    try:
        r = requests.get(page_url, headers={"User-Agent": USER_AGENT}, timeout=15)
        r.raise_for_status()
        html = r.text
    except Exception:
        return []

    seen: set[str] = set()
    matches: list[str] = []
    for m in _HTML_SCREENSHOT_PATTERN.finditer(html):
        u = m.group(0)
        if u not in seen:
            seen.add(u)
            matches.append(u)

    def screen_num(u: str) -> int:
        sm = re.search(r"Screen-(\d+)\.png", u)
        return int(sm.group(1)) if sm else 99

    matches.sort(key=screen_num)
    return [f"{u}{_MZSTATIC_SIZE_SUFFIX}" for u in matches[:20]]


def fetch_screenshots(url: str, output_dir: Path) -> tuple[list[Path], str]:
    """High-level: take an App Store URL, save screenshots locally, return paths.

    Returns (frame_paths_in_order, detected_app_name). Raises RuntimeError if
    no screenshots can be sourced from either iTunes Lookup or HTML scrape.
    """
    app_id, country = parse_app_store_url(url)

    urls, app_name = fetch_screenshot_urls_via_lookup(app_id, country)
    if not urls:
        page_url = (
            url
            if url.strip().lower().startswith("http")
            else f"https://apps.apple.com/{country}/app/id{app_id}"
        )
        urls = scrape_screenshot_urls_via_html(page_url)

    if not urls:
        raise RuntimeError(
            "No screenshots available for this app on the App Store — "
            "try the screen-recording option instead."
        )

    output_dir.mkdir(parents=True, exist_ok=True)

    def download_one(idx_url: tuple[int, str]) -> Optional[Path]:
        i, u = idx_url
        try:
            r = requests.get(u, timeout=30)
            r.raise_for_status()
            ext = ".png" if "image/png" in r.headers.get("content-type", "") else ".jpg"
            p = output_dir / f"{i:03d}{ext}"
            p.write_bytes(r.content)
            return p
        except Exception:
            return None

    paths: list[Path] = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        for result in pool.map(download_one, list(enumerate(urls))):
            if result is not None:
                paths.append(result)

    paths.sort(key=lambda p: p.name)

    if not paths:
        raise RuntimeError(
            f"Found {len(urls)} screenshot URLs but every download failed."
        )

    return paths, (app_name or "Unknown App")
