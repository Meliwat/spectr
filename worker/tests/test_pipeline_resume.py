"""
Tests for the checkpoint/resume logic in local_worker.process_project.

The function is patched at the module level so no real Supabase client,
no real Claude CLI, and no real ffmpeg binary is needed.
"""

import sys
import os
import tempfile
import unittest
from unittest.mock import patch, MagicMock, call

# ---------------------------------------------------------------------------
# Make the worker package importable without installing it.
# We must stub heavy imports before local_worker is imported.
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Stub out third-party packages that aren't available in the test environment
for mod_name in ("supabase", "dotenv", "imagehash"):
    if mod_name not in sys.modules:
        stub = MagicMock()
        sys.modules[mod_name] = stub
        # supabase.create_client needs to be importable directly
        if mod_name == "supabase":
            stub.create_client = MagicMock()

# PIL is used by dedup; stub it too
if "PIL" not in sys.modules:
    pil_stub = MagicMock()
    sys.modules["PIL"] = pil_stub
    sys.modules["PIL.Image"] = MagicMock()

# Now import the worker module (dotenv.load_dotenv is already a MagicMock)
import local_worker
from local_worker import process_project


# ---------------------------------------------------------------------------
# Helper: build a fake DB client whose .table(...) chain is fully mocked.
# ---------------------------------------------------------------------------

def _make_db_client(project_data: dict):
    """Return a mock Supabase client that returns project_data on .single().execute()."""
    client = MagicMock()

    # .table("projects").select(...).eq(...).single().execute().data
    select_chain = MagicMock()
    select_chain.execute.return_value.data = project_data
    (
        client.table.return_value
        .select.return_value
        .eq.return_value
        .single.return_value
    ) = select_chain

    # .table("projects").update(...).eq(...).execute() — just needs to not blow up
    client.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

    # Storage upload
    client.storage.from_.return_value.upload.return_value = MagicMock()
    bucket = MagicMock()
    bucket.public = False
    bucket.file_size_limit = 524288000
    bucket.allowed_mime_types = [
        "video/mp4",
        "video/quicktime",
        "image/png",
        "image/svg+xml",
        "text/markdown",
        "application/zip",
    ]
    client.storage.get_bucket.return_value = bucket

    return client


def _base_project(**kwargs):
    """Minimal project dict; callers override specific keys."""
    base = {
        "reference_app": "TestApp",
        "your_app_name": "MyApp",
        "brand_colors": {},
        "mp4_s3_key": "proj/video.mp4",
        "frontend_spec": None,
        "backend_spec": None,
    }
    base.update(kwargs)
    return base


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestPipelineResume(unittest.TestCase):

    def setUp(self):
        # Reset the module-level bucket-MIME cache so each test gets a clean slate.
        local_worker._bucket_mime_ok = False

    # ------------------------------------------------------------------
    # 1. Both specs in DB → only stitching runs; extraction is skipped.
    # ------------------------------------------------------------------
    @patch.object(local_worker, "get_db")
    @patch.object(local_worker, "claude_text", return_value="# Final Spec")
    @patch.object(local_worker, "extract_frames")
    @patch.object(local_worker, "deduplicate_frames")
    def test_both_specs_stored_skips_to_stitching(
        self, mock_dedup, mock_extract, mock_claude_text, mock_get_db
    ):
        project_data = _base_project(
            frontend_spec="## Frontend",
            backend_spec="## Backend",
        )
        client = _make_db_client(project_data)
        mock_get_db.return_value = client

        process_project("proj-uuid-1234")

        # Extraction must NOT have been called
        mock_extract.assert_not_called()
        mock_dedup.assert_not_called()

        # claude_text for stitching MUST have been called (stage 4)
        mock_claude_text.assert_called_once()

        # Status should have been updated to STATUS_STITCHING at least once
        update_calls = client.table.return_value.update.call_args_list
        statuses_set = [c[0][0].get("status") for c in update_calls if "status" in c[0][0]]
        self.assertIn("stitching", statuses_set)
        self.assertNotIn("extracting", statuses_set)
        self.assertNotIn("analyzing_frontend", statuses_set)
        self.assertNotIn("analyzing_backend", statuses_set)

    # ------------------------------------------------------------------
    # 2. Only frontend_spec in DB → research runs; extraction + vision skipped.
    # ------------------------------------------------------------------
    @patch.object(local_worker, "get_db")
    @patch.object(local_worker, "claude_text", return_value="## Backend / # Final Spec")
    @patch.object(local_worker, "claude_vision")
    @patch.object(local_worker, "extract_frames")
    @patch.object(local_worker, "deduplicate_frames")
    def test_only_frontend_spec_stored_skips_extraction_and_vision(
        self, mock_dedup, mock_extract, mock_vision, mock_claude_text, mock_get_db
    ):
        project_data = _base_project(
            frontend_spec="## Frontend",
            backend_spec=None,
        )
        client = _make_db_client(project_data)
        mock_get_db.return_value = client

        # claude_text is called twice: once for research, once for stitch
        mock_claude_text.side_effect = ["## Backend spec", "# Final Spec"]

        process_project("proj-uuid-5678")

        # Extraction and vision must NOT have been called
        mock_extract.assert_not_called()
        mock_dedup.assert_not_called()
        mock_vision.assert_not_called()

        # claude_text called twice: research + stitch
        self.assertEqual(mock_claude_text.call_count, 2)

        update_calls = client.table.return_value.update.call_args_list
        statuses_set = [c[0][0].get("status") for c in update_calls if "status" in c[0][0]]
        self.assertIn("analyzing_backend", statuses_set)
        self.assertNotIn("extracting", statuses_set)
        self.assertNotIn("analyzing_frontend", statuses_set)

    # ------------------------------------------------------------------
    # 3. Neither spec in DB → full pipeline runs (extract → vision → research → stitch).
    # ------------------------------------------------------------------
    @patch.object(local_worker, "get_db")
    @patch.object(local_worker, "claude_text", return_value="some text")
    @patch.object(local_worker, "claude_vision", return_value="frontend batch result")
    @patch.object(local_worker, "extract_frames", return_value=["/tmp/f/frame_0001.jpg"])
    @patch.object(local_worker, "deduplicate_frames", return_value=["/tmp/f/frame_0001.jpg"])
    def test_no_specs_stored_runs_full_pipeline(
        self, mock_dedup, mock_extract, mock_vision, mock_claude_text, mock_get_db
    ):
        project_data = _base_project(
            frontend_spec=None,
            backend_spec=None,
            mp4_s3_key="proj/video.mp4",
        )
        client = _make_db_client(project_data)
        mock_get_db.return_value = client

        # Storage download must return bytes
        client.storage.from_.return_value.download.return_value = b"fake-mp4-bytes"

        mock_vision.side_effect = ["## Screen Batch", "## Design Tokens Batch"]

        # claude_text: first call = research, second = stitch
        mock_claude_text.side_effect = ["## Backend", "# Spec"]

        process_project("proj-uuid-9999")

        # All stages must have run
        mock_extract.assert_called_once()
        mock_dedup.assert_called_once()
        self.assertEqual(mock_vision.call_count, 2)
        self.assertEqual(mock_claude_text.call_count, 2)

        first_vision_call = mock_vision.call_args_list[0]
        second_vision_call = mock_vision.call_args_list[1]
        expected_frames = ["/tmp/f/frame_0001.jpg"]
        self.assertEqual(first_vision_call.args[0], expected_frames)
        self.assertEqual(second_vision_call.args[0], expected_frames)
        self.assertEqual(
            first_vision_call.args[1],
            local_worker.PROMPT_1_USER.format(n=1, reference_app="TestApp"),
        )
        self.assertEqual(
            second_vision_call.args[1],
            local_worker.PROMPT_1B_USER.format(n=1, reference_app="TestApp"),
        )
        self.assertEqual(first_vision_call.kwargs["system"], local_worker.PROMPT_1_SYSTEM)
        self.assertEqual(second_vision_call.kwargs["system"], local_worker.PROMPT_1B_SYSTEM)

        first_text_call = mock_claude_text.call_args_list[0]
        self.assertEqual(first_text_call.kwargs["system"], local_worker.PROMPT_2_SYSTEM)
        self.assertEqual(first_text_call.kwargs["tools"], ["WebSearch"])

        frontend_updates = [
            c.args[0]["frontend_spec"]
            for c in client.table.return_value.update.call_args_list
            if "frontend_spec" in c.args[0]
        ]
        self.assertEqual(len(frontend_updates), 1)
        self.assertEqual(
            frontend_updates[0],
            "## Screen Batch\n\n---\n## DESIGN TOKENS\n---\n\n## Design Tokens Batch",
        )

        update_calls = client.table.return_value.update.call_args_list
        statuses_set = [c[0][0].get("status") for c in update_calls if "status" in c[0][0]]
        self.assertIn("extracting", statuses_set)
        self.assertIn("analyzing_frontend", statuses_set)
        self.assertIn("analyzing_backend", statuses_set)
        self.assertIn("stitching", statuses_set)
        self.assertIn("complete", statuses_set)

    @patch.object(local_worker, "get_db")
    @patch.object(local_worker, "claude_text", return_value="some text")
    @patch.object(local_worker, "claude_vision", return_value="frontend batch result")
    @patch.object(local_worker, "extract_frames", return_value=["/tmp/f/frame_0001.jpg"])
    @patch.object(local_worker, "deduplicate_frames", return_value=["/tmp/f/frame_0001.jpg"])
    def test_bundle_upload_updates_bucket_allowlist_for_zip(
        self, mock_dedup, mock_extract, mock_vision, mock_claude_text, mock_get_db
    ):
        project_data = _base_project(
            frontend_spec=None,
            backend_spec=None,
            mp4_s3_key="proj/video.mp4",
        )
        client = _make_db_client(project_data)
        client.storage.from_.return_value.download.return_value = b"fake-mp4-bytes"
        client.storage.get_bucket.return_value.allowed_mime_types = [
            "video/mp4",
            "video/quicktime",
            "image/png",
            "image/svg+xml",
            "text/markdown",
        ]
        mock_get_db.return_value = client
        mock_vision.side_effect = ["## Screen Batch", "## Design Tokens Batch"]
        mock_claude_text.side_effect = ["## Backend", "# Spec"]

        process_project("proj-uuid-zip-fix")

        client.storage.update_bucket.assert_called_once()
        bucket_id, options = client.storage.update_bucket.call_args.args
        self.assertEqual(bucket_id, "spectr-uploads")
        self.assertEqual(list(options.keys()), ["allowed_mime_types"])
        self.assertIn("application/zip", options["allowed_mime_types"])


if __name__ == "__main__":
    unittest.main()
