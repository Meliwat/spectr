"""Tests for the pipeline orchestrator's deterministic paths.

Vision + spec generation paths are not covered here — they hit the Anthropic
API and cost real money per invocation. Input classification and error
handling are pure functions and worth pinning.
"""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from spectr_mcp.pipeline import _input_is_mp4, generate_spec


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

    def test_existing_m4v_recognized(self):
        with tempfile.NamedTemporaryFile(suffix=".m4v", delete=False) as f:
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

    def test_app_store_url_not_recognized_as_mp4(self):
        self.assertFalse(_input_is_mp4("https://apps.apple.com/us/app/x/id1"))

    def test_random_string_not_recognized(self):
        self.assertFalse(_input_is_mp4("hello world"))

    def test_empty_string_not_recognized(self):
        self.assertFalse(_input_is_mp4(""))


class TestGenerateSpecValidation(unittest.TestCase):
    """generate_spec's input validation runs before any network or pipeline
    work, so we can test it without mocking or API calls."""

    def test_missing_reference_app_raises(self):
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(b"not a real mp4")
            path = f.name
        try:
            with self.assertRaises(ValueError) as ctx:
                generate_spec(path, reference_app="")
            self.assertIn("reference_app", str(ctx.exception))
        finally:
            Path(path).unlink(missing_ok=True)

    def test_whitespace_only_reference_app_raises(self):
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(b"x")
            path = f.name
        try:
            with self.assertRaises(ValueError):
                generate_spec(path, reference_app="   ")
        finally:
            Path(path).unlink(missing_ok=True)

    def test_nonexistent_source_raises(self):
        with self.assertRaises(ValueError) as ctx:
            generate_spec("/does/not/exist.mp4", reference_app="Test")
        self.assertIn("existing", str(ctx.exception))

    def test_app_store_url_no_longer_accepted(self):
        """Regression: App Store URL input was supported in v0.1.0; removed
        in mp4-only-all-paths. Pipeline now rejects URLs."""
        with self.assertRaises(ValueError):
            generate_spec(
                "https://apps.apple.com/us/app/x/id1",
                reference_app="Test",
            )

    def test_non_video_file_raises(self):
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
            path = f.name
        try:
            with self.assertRaises(ValueError):
                generate_spec(path, reference_app="Test")
        finally:
            Path(path).unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
