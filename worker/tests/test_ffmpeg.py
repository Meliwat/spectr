"""
Tests for worker/services/ffmpeg.py — extract_frames function.

All tests mock subprocess.run and Path.glob so no real video files or
ffmpeg binary are required.
"""

import sys
import os
import types
import unittest
from unittest.mock import patch, MagicMock, call
from pathlib import Path
import subprocess

# ---------------------------------------------------------------------------
# Make the worker package importable without installing it
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.ffmpeg import extract_frames, MIN_SCENE_FRAMES


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ok_result():
    """Simulate a subprocess.CompletedProcess with returncode=0."""
    r = MagicMock()
    r.returncode = 0
    r.stderr = ""
    return r


def _fail_result(stderr="ffmpeg error"):
    """Simulate a subprocess.CompletedProcess with returncode=1."""
    r = MagicMock()
    r.returncode = 1
    r.stderr = stderr
    return r


def _mock_path(paths: list[str]):
    """Return a mock Path instance whose .glob() yields Path objects for each path string."""
    mock = MagicMock(spec=Path)
    mock.glob.return_value = [Path(p) for p in paths]
    return mock


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestExtractFrames(unittest.TestCase):

    # ------------------------------------------------------------------
    # 1. Scene detection returns >= MIN_SCENE_FRAMES → use scene frames,
    #    no fallback subprocess call.
    # ------------------------------------------------------------------
    @patch("services.ffmpeg.subprocess.run")
    @patch("services.ffmpeg.Path")
    @patch("services.ffmpeg.os.makedirs")
    def test_scene_detection_enough_frames_no_fallback(
        self, mock_makedirs, mock_Path_cls, mock_run
    ):
        scene_frames = [f"/out/frame_{i:04d}.jpg" for i in range(1, MIN_SCENE_FRAMES + 3)]

        mock_run.return_value = _ok_result()

        # Path(output_dir) is called twice in the real code:
        #   1. after scene detection  -> glob returns scene_frames
        #   2. (never reached for fallback cleanup)
        path_instance = _mock_path(scene_frames)
        mock_Path_cls.return_value = path_instance

        result = extract_frames("/input/video.mp4", "/out")

        # subprocess.run should have been called exactly once (scene command)
        self.assertEqual(mock_run.call_count, 1)
        scene_cmd = mock_run.call_args[0][0]
        self.assertIn("select=gt(scene", " ".join(scene_cmd))

        # Returned paths should be the sorted scene frames
        self.assertEqual(result, sorted(scene_frames))

    # ------------------------------------------------------------------
    # 2. Scene detection succeeds but returns < MIN_SCENE_FRAMES frames
    #    → falls back to 1fps extraction.
    # ------------------------------------------------------------------
    @patch("services.ffmpeg.subprocess.run")
    @patch("services.ffmpeg.Path")
    @patch("services.ffmpeg.os.makedirs")
    def test_scene_detection_too_few_frames_falls_back(
        self, mock_makedirs, mock_Path_cls, mock_run
    ):
        fps_frames = [f"/out/frame_{i:04d}.jpg" for i in range(1, 6)]

        # subprocess.run always succeeds
        mock_run.return_value = _ok_result()

        # Path(output_dir) instantiation order:
        #   call 1 (after scene)  — glob returns < MIN_SCENE_FRAMES files
        #   call 2 (cleanup loop) — glob returns those same sparse files (unlink is called)
        #   call 3 (after fps)    — glob returns the fps frames
        sparse = [f"/out/frame_{i:04d}.jpg" for i in range(1, MIN_SCENE_FRAMES)]

        # Build mock files for cleanup: each has an .unlink() method
        def make_file_mock(p):
            m = MagicMock()
            m.__str__ = lambda self: p
            m.unlink = MagicMock()
            return m

        sparse_mocks = [make_file_mock(p) for p in sparse]
        fps_mocks = [MagicMock(__str__=lambda self, p=p: p) for p in fps_frames]

        path_instance = MagicMock(spec=Path)
        path_instance.glob.side_effect = [
            [Path(p) for p in sparse],   # after scene: too few
            sparse_mocks,                 # cleanup loop
            [Path(p) for p in fps_frames],  # after fps
        ]
        mock_Path_cls.return_value = path_instance

        result = extract_frames("/input/video.mp4", "/out")

        # subprocess.run called twice: scene + fps
        self.assertEqual(mock_run.call_count, 2)
        fps_cmd = mock_run.call_args_list[1][0][0]
        self.assertIn("fps=", " ".join(fps_cmd))

        self.assertEqual(result, sorted(fps_frames))

    # ------------------------------------------------------------------
    # 3. Scene detection subprocess fails (non-zero exit) → fallback.
    # ------------------------------------------------------------------
    @patch("services.ffmpeg.subprocess.run")
    @patch("services.ffmpeg.Path")
    @patch("services.ffmpeg.os.makedirs")
    def test_scene_detection_subprocess_failure_falls_back(
        self, mock_makedirs, mock_Path_cls, mock_run
    ):
        fps_frames = [f"/out/frame_{i:04d}.jpg" for i in range(1, 8)]

        # First call (scene) fails; second call (fps) succeeds
        mock_run.side_effect = [_fail_result(), _ok_result()]

        path_instance = MagicMock(spec=Path)
        path_instance.glob.side_effect = [
            [],                              # cleanup loop (no partial files)
            [Path(p) for p in fps_frames],   # after fps
        ]
        mock_Path_cls.return_value = path_instance

        result = extract_frames("/input/video.mp4", "/out")

        self.assertEqual(mock_run.call_count, 2)
        # First call was the scene command
        scene_cmd = mock_run.call_args_list[0][0][0]
        self.assertIn("select=gt(scene", " ".join(scene_cmd))
        # Second call was the fps fallback
        fps_cmd = mock_run.call_args_list[1][0][0]
        self.assertIn("fps=", " ".join(fps_cmd))

        self.assertEqual(result, sorted(fps_frames))

    # ------------------------------------------------------------------
    # 4. 1fps fallback also fails → RuntimeError raised.
    # ------------------------------------------------------------------
    @patch("services.ffmpeg.subprocess.run")
    @patch("services.ffmpeg.Path")
    @patch("services.ffmpeg.os.makedirs")
    def test_fps_fallback_failure_raises_runtime_error(
        self, mock_makedirs, mock_Path_cls, mock_run
    ):
        # Both scene and fps commands fail
        mock_run.side_effect = [_fail_result("scene err"), _fail_result("fps err")]

        path_instance = MagicMock(spec=Path)
        path_instance.glob.return_value = []  # cleanup: nothing to delete
        mock_Path_cls.return_value = path_instance

        with self.assertRaises(RuntimeError) as ctx:
            extract_frames("/input/video.mp4", "/out")

        self.assertIn("ffmpeg failed", str(ctx.exception))

    @patch("services.ffmpeg.subprocess.run")
    @patch("services.ffmpeg.Path")
    @patch("services.ffmpeg.os.makedirs")
    def test_scene_detection_timeout_falls_back_to_fps(
        self, mock_makedirs, mock_Path_cls, mock_run
    ):
        fps_frames = [f"/out/frame_{i:04d}.jpg" for i in range(1, 4)]

        mock_run.side_effect = [
            subprocess.TimeoutExpired(cmd="ffmpeg", timeout=600),
            _ok_result(),
        ]

        path_instance = MagicMock(spec=Path)
        path_instance.glob.side_effect = [
            [],  # cleanup loop after timed out scene extraction
            [Path(p) for p in fps_frames],
        ]
        mock_Path_cls.return_value = path_instance

        result = extract_frames("/input/video.mp4", "/out")

        self.assertEqual(mock_run.call_count, 2)
        self.assertEqual(result, sorted(fps_frames))


if __name__ == "__main__":
    unittest.main()
