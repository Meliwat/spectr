"""Tests for App Store URL parsing + HTML scrape (deterministic paths only).

Network-touching paths (fetch_screenshot_urls_via_lookup, fetch_screenshots) are
integration territory and excluded — the value of those tests doesn't justify
mocking iTunes API + HTTP responses.
"""

from __future__ import annotations

import unittest

from spectr_mcp.appstore import (
    parse_app_store_url,
    scrape_screenshot_urls_via_html,
    _HTML_SCREENSHOT_PATTERN,
)


class TestParseAppStoreUrl(unittest.TestCase):
    def test_full_url_us(self):
        app_id, country = parse_app_store_url(
            "https://apps.apple.com/us/app/doordash-food-delivery/id719972451"
        )
        self.assertEqual(app_id, "719972451")
        self.assertEqual(country, "us")

    def test_full_url_with_country(self):
        app_id, country = parse_app_store_url(
            "https://apps.apple.com/gb/app/some-app/id123456789"
        )
        self.assertEqual(app_id, "123456789")
        self.assertEqual(country, "gb")

    def test_full_url_with_query_string(self):
        app_id, country = parse_app_store_url(
            "https://apps.apple.com/us/app/foo/id987654321?mt=8&l=en"
        )
        self.assertEqual(app_id, "987654321")
        self.assertEqual(country, "us")

    def test_bare_id_form(self):
        app_id, country = parse_app_store_url("id555555555")
        self.assertEqual(app_id, "555555555")
        self.assertEqual(country, "us")  # default

    def test_digits_only(self):
        app_id, country = parse_app_store_url("111222333")
        self.assertEqual(app_id, "111222333")
        self.assertEqual(country, "us")

    def test_whitespace_handled(self):
        app_id, country = parse_app_store_url(
            "  https://apps.apple.com/us/app/x/id42  \n"
        )
        self.assertEqual(app_id, "42")
        self.assertEqual(country, "us")

    def test_empty_url_raises(self):
        with self.assertRaises(ValueError):
            parse_app_store_url("")

    def test_only_whitespace_raises(self):
        with self.assertRaises(ValueError):
            parse_app_store_url("   \n  ")

    def test_invalid_url_raises(self):
        with self.assertRaises(ValueError) as ctx:
            parse_app_store_url("https://example.com/not-an-app-store")
        self.assertIn("Could not extract app id", str(ctx.exception))

    def test_country_lowercased(self):
        app_id, country = parse_app_store_url(
            "https://apps.apple.com/CA/app/x/id100"
        )
        self.assertEqual(country, "ca")


class TestScrapeRegex(unittest.TestCase):
    """The regex is fragile vs. Apple's HTML format. These tests pin it so a
    silent regex break is loud."""

    def test_pattern_matches_canonical_url(self):
        html = (
            '<source srcset="'
            'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/aa/bb/cc/'
            'aabbcc-1234/AppStore-iPhone6.9-Screen-01.png/300x0w.webp"'
        )
        matches = _HTML_SCREENSHOT_PATTERN.findall(html)
        self.assertEqual(len(matches), 1)
        self.assertTrue(matches[0].endswith("AppStore-iPhone6.9-Screen-01.png"))

    def test_scrape_dedupes_and_sorts(self):
        html = (
            'foo '
            'https://is1.mzstatic.com/image/thumb/abc/AppStore-iPhone6.9-Screen-03.png '
            'bar '
            'https://is2.mzstatic.com/image/thumb/abc/AppStore-iPhone6.9-Screen-01.png '
            'baz '
            'https://is1.mzstatic.com/image/thumb/abc/AppStore-iPhone6.9-Screen-03.png '  # dup
            'qux '
            'https://is3.mzstatic.com/image/thumb/abc/AppStore-iPhone6.9-Screen-02.png'
        )
        # Use the matcher directly (network-free) — scrape_screenshot_urls_via_html
        # would otherwise try to fetch. Replicate the dedup/sort logic.
        seen: set[str] = set()
        matches: list[str] = []
        for m in _HTML_SCREENSHOT_PATTERN.finditer(html):
            u = m.group(0)
            if u not in seen:
                seen.add(u)
                matches.append(u)
        import re
        matches.sort(
            key=lambda u: int(re.search(r"Screen-(\d+)\.png", u).group(1))
        )
        # Should be 3 unique, in screen-order
        self.assertEqual(len(matches), 3)
        self.assertIn("Screen-01.png", matches[0])
        self.assertIn("Screen-02.png", matches[1])
        self.assertIn("Screen-03.png", matches[2])

    def test_pattern_rejects_non_mzstatic_host(self):
        html = (
            'https://cdn.example.com/AppStore-iPhone6.9-Screen-01.png '
            'https://is.mzstatic.com/image/thumb/foo/AppStore-iPad-Screen-01.png'
        )
        matches = _HTML_SCREENSHOT_PATTERN.findall(html)
        # First doesn't match mzstatic host; second is iPad not iPhone
        self.assertEqual(matches, [])

    def test_scrape_empty_html_returns_empty(self):
        """scrape_screenshot_urls_via_html should return [] for unreachable URL
        AND for HTML with no matches. We can't test the unreachable case
        without network, but the regex behavior is testable."""
        html = "<html><body>nothing here</body></html>"
        matches = _HTML_SCREENSHOT_PATTERN.findall(html)
        self.assertEqual(matches, [])


if __name__ == "__main__":
    unittest.main()
