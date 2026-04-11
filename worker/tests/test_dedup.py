"""
Tests for worker/services/dedup.py — deduplicate_frames function.

imagehash and PIL are mocked so no real image files are needed.
"""

import sys
import os
import unittest
from unittest.mock import patch, MagicMock

# ---------------------------------------------------------------------------
# Make the worker package importable without installing it.
# Stub imagehash and PIL before importing the module under test.
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

for mod_name in ("imagehash", "PIL", "PIL.Image"):
    if mod_name not in sys.modules:
        sys.modules[mod_name] = MagicMock()

from services.dedup import deduplicate_frames


# ---------------------------------------------------------------------------
# Fake hash helpers
# ---------------------------------------------------------------------------

class FakeHash:
    """Minimal stand-in for an imagehash hash object.

    The real imagehash uses `abs(h1 - h2)` to measure perceptual distance.
    We simulate this with a simple integer value: identical hashes produce
    distance 0, distinct hashes produce a distance larger than the default
    threshold (8).
    """

    def __init__(self, value: int):
        self.value = value

    def __sub__(self, other):
        return abs(self.value - other.value)

    def __abs__(self):
        return abs(self.value)


# Distance between two FakeHash objects with the same value is 0 (<= threshold=8)
# Distance between values 0 and 100 is 100 (> threshold=8)
SAME_HASH = FakeHash(0)
DIFF_HASH_A = FakeHash(0)    # identical to SAME_HASH → duplicate
DIFF_HASH_B = FakeHash(100)  # far from SAME_HASH → unique
DIFF_HASH_C = FakeHash(200)  # far from everything above → unique


class TestDeduplicateFrames(unittest.TestCase):

    # ------------------------------------------------------------------
    # 1. Empty input → empty output.
    # ------------------------------------------------------------------
    def test_empty_list_returns_empty(self):
        result = deduplicate_frames([])
        self.assertEqual(result, [])

    # ------------------------------------------------------------------
    # 2. All identical frames → only the first is kept.
    # ------------------------------------------------------------------
    @patch("services.dedup.imagehash.phash")
    @patch("services.dedup.Image.open")
    def test_all_identical_returns_one(self, mock_open, mock_phash):
        # Every frame has the same perceptual hash
        mock_phash.return_value = FakeHash(0)
        mock_open.return_value = MagicMock()  # PIL Image stub

        paths = ["/tmp/frame_0001.jpg", "/tmp/frame_0002.jpg", "/tmp/frame_0003.jpg"]
        result = deduplicate_frames(paths, threshold=8)

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0], paths[0])

    # ------------------------------------------------------------------
    # 3. All unique frames → all are returned (in order).
    # ------------------------------------------------------------------
    @patch("services.dedup.imagehash.phash")
    @patch("services.dedup.Image.open")
    def test_all_unique_returns_all(self, mock_open, mock_phash):
        # Each frame has a very different hash
        mock_phash.side_effect = [FakeHash(0), FakeHash(100), FakeHash(200)]
        mock_open.return_value = MagicMock()

        paths = ["/tmp/frame_0001.jpg", "/tmp/frame_0002.jpg", "/tmp/frame_0003.jpg"]
        result = deduplicate_frames(paths, threshold=8)

        self.assertEqual(result, paths)

    # ------------------------------------------------------------------
    # Bonus: mixed case — some duplicates, some unique.
    # ------------------------------------------------------------------
    @patch("services.dedup.imagehash.phash")
    @patch("services.dedup.Image.open")
    def test_mixed_keeps_unique_ones(self, mock_open, mock_phash):
        # frame1=0, frame2=0 (dup of 1), frame3=100 (unique), frame4=100 (dup of 3)
        mock_phash.side_effect = [FakeHash(0), FakeHash(0), FakeHash(100), FakeHash(100)]
        mock_open.return_value = MagicMock()

        paths = [
            "/tmp/frame_0001.jpg",
            "/tmp/frame_0002.jpg",
            "/tmp/frame_0003.jpg",
            "/tmp/frame_0004.jpg",
        ]
        result = deduplicate_frames(paths, threshold=8)

        self.assertEqual(len(result), 2)
        self.assertIn("/tmp/frame_0001.jpg", result)
        self.assertIn("/tmp/frame_0003.jpg", result)

    # ------------------------------------------------------------------
    # Edge case: frames that raise an exception are silently skipped.
    # ------------------------------------------------------------------
    @patch("services.dedup.imagehash.phash")
    @patch("services.dedup.Image.open")
    def test_corrupt_frame_is_skipped(self, mock_open, mock_phash):
        # Second frame raises IOError (corrupt file)
        mock_open.side_effect = [MagicMock(), IOError("corrupt"), MagicMock()]
        mock_phash.side_effect = [FakeHash(0), FakeHash(200)]

        paths = ["/tmp/ok1.jpg", "/tmp/bad.jpg", "/tmp/ok2.jpg"]
        result = deduplicate_frames(paths, threshold=8)

        # ok1 and ok2 are unique (distance 200 > 8); bad is skipped
        self.assertEqual(len(result), 2)
        self.assertNotIn("/tmp/bad.jpg", result)


if __name__ == "__main__":
    unittest.main()
