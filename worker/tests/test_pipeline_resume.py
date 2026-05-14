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
        "screen_analysis": None,
        "transitions": None,
        "canonical_schema": None,
        "repair_attempts": 0,
        "total_retries": 0,
        "bundle_s3_key": None,
    }
    base.update(kwargs)
    return base


# The new fast_spec generates the full 10-section DESIGN.md in one
# comprehensive Sonnet call instead of 5 parallel section calls. The mock
# returns a minimal-but-valid DESIGN.md whenever it sees the canonical
# prompt opener.
FAST_SPEC_DESIGN_MD = (
    "# Design System Inspiration of TestApp (iOS)\n\n"
    "## 1. Visual Theme & Atmosphere\n\n"
    "TestApp is a concise consumer product experience designed around speed and clarity.\n\n"
    "**Key Characteristics:**\n- Single accent color\n- Edge-to-edge cards\n- Tabular numerals everywhere\n\n"
    "## 2. Color Palette & Roles\n\n"
    "### Primary\n- **Blue** (`#2032d5`): primary accent, CTAs\n\n"
    "## 3. Typography Rules\n\n"
    "### Font Family\nSF Pro Text with system fallback.\n\n"
    "### Hierarchy\n\n"
    "| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |\n"
    "|------|------|------|--------|-------------|----------------|-------|\n"
    "| Body | SF Pro Text | `15pt` | `400` | `20pt` | `0` | Base copy |\n\n"
    "## 4. Component Stylings\n\n### Buttons\nPrimary fills in `#2032d5`, 12pt radius.\n\n"
    "## 5. Screen Inventory & Patterns\n\n### Home\nFeed of cards with a sticky header.\n\n"
    "## 6. Layout & Spacing\n\n| Token | Value | Usage |\n|---|---|---|\n| `md` | `16pt` | Card padding |\n\n"
    "## 7. Depth & Elevation\n\n| Level | Treatment | Use |\n|---|---|---|\n| 1 | `shadow: 0 1pt 2pt rgba(0,0,0,0.08)` | Cards |\n\n"
    "## 8. Dos and Don'ts\n\n### Do\n- **Bold principle** — reason it matters\n\n### Don't\n- **Bold principle** — reason it matters\n\n"
    "## 9. Responsive / Adaptive Rules\n\n| Name | Width | Key Changes |\n|---|---|---|\n| Mobile Standard | `375pt` | Baseline |\n\n"
    "## 10. Quick Reference Cheat Sheet\n\nPrimary `#2032d5` · Body 15pt 400 · Card radius 12pt.\n"
)


# fast_spec emits exactly one model call per project in the new pipeline.
FAST_SPEC_DESIGN_MD_CALLS = 1


def _fast_spec_side_effect():
    def _respond(prompt, **kwargs):
        if "Produce a single DESIGN.md file for the iOS app" in prompt:
            return FAST_SPEC_DESIGN_MD
        raise AssertionError(f"Unexpected fast_spec prompt: {prompt[:160]}")

    return _respond


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestPipelineResume(unittest.TestCase):

    def setUp(self):
        # Reset the module-level bucket-MIME cache so each test gets a clean slate.
        local_worker._bucket_mime_ok = False
        local_worker._unsupported_project_columns.clear()
        local_worker.OUTPUT_MODE = "spec"

    # ------------------------------------------------------------------
    # 1. Stored frontend analysis → only sectioned spec generation runs.
    # ------------------------------------------------------------------
    @patch.object(local_worker, "get_db")
    @patch.object(local_worker, "claude_text")
    @patch.object(local_worker, "extract_frames")
    @patch.object(local_worker, "deduplicate_frames")
    def test_stored_frontend_analysis_skips_extraction_and_generates_sections(
        self, mock_dedup, mock_extract, mock_claude_text, mock_get_db
    ):
        project_data = _base_project(
            frontend_spec="## Frontend",
        )
        client = _make_db_client(project_data)
        mock_get_db.return_value = client
        mock_claude_text.side_effect = _fast_spec_side_effect()

        process_project("proj-uuid-1234")

        # Extraction must NOT have been called
        mock_extract.assert_not_called()
        mock_dedup.assert_not_called()

        # fast_spec issues exactly one Sonnet call to produce DESIGN.md
        self.assertEqual(mock_claude_text.call_count, FAST_SPEC_DESIGN_MD_CALLS)

        update_calls = client.table.return_value.update.call_args_list
        statuses_set = [c[0][0].get("status") for c in update_calls if "status" in c[0][0]]
        self.assertIn("stitching", statuses_set)
        self.assertNotIn("extracting", statuses_set)
        self.assertNotIn("analyzing_frontend", statuses_set)
        self.assertNotIn("analyzing_backend", statuses_set)

        stored_specs = [c.args[0]["spec_md_text"] for c in update_calls if "spec_md_text" in c.args[0]]
        self.assertEqual(len(stored_specs), 1)
        # New DESIGN.md output: starts with the canonical inspired-by title and
        # carries the gallery template's 10-section structure.
        self.assertTrue(stored_specs[0].startswith("# Design System Inspiration of TestApp"))
        self.assertIn("## 1. Visual Theme & Atmosphere", stored_specs[0])
        self.assertIn("## 5. Screen Inventory & Patterns", stored_specs[0])
        self.assertIn("## 10. Quick Reference Cheat Sheet", stored_specs[0])

    # ------------------------------------------------------------------
    # 2. No stored analysis → full frontend-only spec pipeline runs.
    # ------------------------------------------------------------------
    # (The legacy "invalid section output marks project failed" test was
    # removed when the pipeline migrated to fast_spec — fast_spec does not
    # validate section headings, so that failure mode no longer exists.)
    @patch.object(local_worker, "get_db")
    @patch.object(local_worker, "claude_text")
    @patch.object(local_worker, "claude_vision", return_value="frontend batch result")
    @patch.object(local_worker, "extract_frames", return_value=["/tmp/f/frame_0001.jpg"])
    @patch.object(local_worker, "deduplicate_frames", return_value=["/tmp/f/frame_0001.jpg"])
    @patch.object(local_worker, "fetch_app_research", return_value="")
    def test_no_specs_stored_runs_full_pipeline(
        self, mock_research, mock_dedup, mock_extract, mock_vision, mock_claude_text, mock_get_db
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
        mock_claude_text.side_effect = _fast_spec_side_effect()

        process_project("proj-uuid-9999")

        # All stages must have run
        mock_extract.assert_called_once()
        mock_dedup.assert_called_once()
        self.assertEqual(mock_vision.call_count, 2)
        self.assertEqual(mock_claude_text.call_count, FAST_SPEC_DESIGN_MD_CALLS)

        expected_frames = ["/tmp/f/frame_0001.jpg"]
        seen_vision_calls = {
            (
                tuple(call.args[0]),
                call.args[1],
                call.kwargs["system"],
            )
            for call in mock_vision.call_args_list
        }
        self.assertEqual(
            seen_vision_calls,
            {
                (
                    tuple(expected_frames),
                    local_worker.PROMPT_1_USER.format(n=1, reference_app="TestApp"),
                    local_worker.PROMPT_1_SYSTEM,
                ),
                (
                    tuple(expected_frames),
                    local_worker.PROMPT_1B_USER.format(n=1, reference_app="TestApp"),
                    local_worker.PROMPT_1B_SYSTEM,
                ),
            },
        )

        # fast_spec issues exactly one Sonnet call to produce DESIGN.md.
        for call in mock_claude_text.call_args_list:
            self.assertEqual(call.kwargs.get("model"), "claude-sonnet-4-6")

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
        self.assertIn("stitching", statuses_set)
        self.assertIn("complete", statuses_set)

    @patch.object(local_worker, "get_db")
    def test_update_project_skips_schema_cache_columns(self, mock_get_db):
        client = MagicMock()
        mock_get_db.return_value = client
        execute = client.table.return_value.update.return_value.eq.return_value.execute
        execute.side_effect = [
            Exception(
                "{'code': 'PGRST204', 'message': \"Could not find the 'screen_analysis' column of 'projects' in the schema cache\"}"
            ),
            MagicMock(),
        ]

        local_worker.update_project(
            "proj-mobile-schema-cache",
            {"status": "analyzing_screens", "screen_analysis": [{"name": "Home"}]},
        )

        update_calls = client.table.return_value.update.call_args_list
        self.assertEqual(update_calls[0].args[0]["status"], "analyzing_screens")
        self.assertIn("screen_analysis", update_calls[0].args[0])
        self.assertEqual(update_calls[1].args[0], {"status": "analyzing_screens"})
        self.assertIn("screen_analysis", local_worker._unsupported_project_columns)


if __name__ == "__main__":
    unittest.main()
