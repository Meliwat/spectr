"""Tests for the pipeline orchestrator's deterministic paths.

Vision + spec generation paths are not covered here — they hit the Anthropic
API and cost real money per invocation. Input classification and error
handling are pure functions and worth pinning.
"""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from spectr_mcp.pipeline import (
    _input_is_app_store_url,
    _input_is_mp4,
    generate_spec,
)


class TestInputClassification(unittest.TestCase):
    def test_full_app_store_url_recognized(self):
        self.assertTrue(
            _input_is_app_store_url("https://apps.apple.com/us/app/x/id123")
        )

    def test_itunes_url_recognized(self):
        self.assertTrue(_input_is_app_store_url("https://itunes.apple.com/lookup?id=42"))

    def test_bare_id_recognized(self):
        self.assertTrue(_input_is_app_store_url("id123456789"))

    def test_digits_recognized(self):
        self.assertTrue(_input_is_app_store_url("123456789"))

    def test_mp4_path_not_recognized_as_url(self):
        self.assertFalse(_input_is_app_store_url("/Users/me/recording.mp4"))

    def test_random_string_not_recognized(self):
        self.assertFalse(_input_is_app_store_url("hello world"))

    def test_empty_string_not_recognized(self):
        self.assertFalse(_input_is_app_store_url(""))

    def test_url_case_insensitive(self):
        self.assertTrue(_input_is_app_store_url("HTTPS://APPS.APPLE.COM/us/app/x/id42"))


class TestMP4Classification(unittest.TestCase):
    def test_existing_mp4_recognized(self):
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(b"not a real mp4")
            path = f.name
        try:
            self.assertTrue(_input_is_mp4(path))
        finally:
            Path(path).unlink(missing_ok=True)

    def test_existing_mov_recognized(self):
        with tempfile.NamedTemporaryFile(suffix=".mov", delete=False) as f:
            path = f.name
        try:
            self.assertTrue(_input_is_mp4(path))
        finally:
            Path(path).unlink(missing_ok=True)

    def test_nonexistent_path_not_recognized(self):
        self.assertFalse(_input_is_mp4("/does/not/exist.mp4"))

    def test_directory_not_recognized(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertFalse(_input_is_mp4(d))

    def test_non_video_extension_not_recognized(self):
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
            path = f.name
        try:
            self.assertFalse(_input_is_mp4(path))
        finally:
            Path(path).unlink(missing_ok=True)

    def test_url_not_recognized_as_mp4(self):
        self.assertFalse(_input_is_mp4("https://apps.apple.com/us/app/x/id1"))


class TestGenerateSpecValidation(unittest.TestCase):
    """generate_spec's input validation runs before any network or pipeline
    work, so we can test it without mocking or API calls."""

    def test_unrecognized_source_raises_value_error(self):
        with self.assertRaises(ValueError) as ctx:
            generate_spec("totally not a url or path")
        self.assertIn("neither an App Store URL nor an existing MP4 file", str(ctx.exception))

    def test_mp4_without_reference_app_raises(self):
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(b"not a real mp4")
            path = f.name
        try:
            with self.assertRaises(ValueError) as ctx:
                generate_spec(path)  # no reference_app
            self.assertIn("reference_app", str(ctx.exception))
        finally:
            Path(path).unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
