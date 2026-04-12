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


def _spec_section_outputs(app_name: str = "MyApp", reference_app: str = "TestApp"):
    return [
        "## App Overview\n\nMyApp is a React Native mobile app for iPhone and Android phones, with the base-model iPhone 15 as the baseline sizing reference, designed around a concise consumer product experience.",
        "## Navigation Structure\n\nUsers move between Home, Browse, and Me with modal overlays for search and cart.",
        "## Screen Specifications\n\n### Home Feed\n- Purpose: discover restaurants\n- Layout: sticky header, carousels, promos",
        "## Shared Components\n\n### 1. SearchBar\nReusable search entry point used on Home and Browse.",
        "\n".join(
            [
                "## Design System",
                "",
                "### Color Palette",
                "#### Primary",
                "- **Blue** (`#2032d5`): primary accent",
                "",
                "### Typography",
                "| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |",
                "|---|---|---|---|---|---|---|",
                "| Body | SF Pro Text | `15px` | `400` | `20px` | `0` | Base copy |",
                "",
                "### Principles",
                "- Consistency comes from native typography.",
                "",
                "### Spacing & Layout",
                "| Token | Value | Usage |",
                "|---|---|---|",
                "| `--space-md` | `16px` | Screen inset |",
                "",
                "### Component Styles",
                "Cards use `12px` radius and dark surfaces.",
                "",
                "### Elevation & Depth",
                "| Level | Treatment | Use |",
                "|---|---|---|",
                "| 1 | `background: #191a1b` | Cards |",
                "",
                "### Responsive Breakpoints",
                "| Name | Width | Key Changes |",
                "|---|---|---|",
                "| Mobile Standard | `375px` | Baseline layout |",
                "",
                "### Do's and Don'ts",
                "- **Use one accent color** — it keeps call-to-action hierarchy clear",
                "",
                "### Design Principles",
                "- Dark surfaces make content and photography pop.",
            ]
        ),
        "\n".join(
            [
                "## Frontend Implementation Notes",
                "",
                "- Use Expo SDK 54 with React Native, TypeScript, React Navigation, Zustand, and react-native-svg.",
                "- Prefer Animated and FlatList by default, and only reach for heavier libraries when clearly necessary.",
                "- Install Expo-native packages with `npx expo install` and keep everything Expo Go compatible.",
                "- Optimize the baseline layout for iPhone 15.",
                "- When branding overrides only change colors, preserve restaurant photos, merchant banners, and merchant logos unless an explicit replacement logo is provided.",
            ]
        ),
        "\n".join(
            [
                "## Claude Code Prompt",
                "",
                "Paste everything below this line into Claude Code:",
                "",
                f"Build a mobile-first frontend for {app_name}, a clone of {reference_app}.",
                "- Expo SDK 54",
                "- React Native",
                "- TypeScript",
                "- React Navigation",
                "- Zustand",
                "- react-native-svg",
                "Implement Home, Browse, Restaurant Detail, Search, and Cart first.",
                "Shared components from day one: BottomTabBar, SearchBar, SectionHeader, RestaurantCard, MenuItemCard.",
                "Prefer Animated and FlatList by default, using reanimated or FlashList only when clearly necessary.",
                "Install Expo-native packages only with `npx expo install`, using Expo-compatible package versions for SDK 54.",
                "Prioritize Expo Go compatibility and runtime stability over exact animation fidelity.",
                "Do not run iOS build, simulator, or npm commands at the end; final execution will be done manually by the user.",
                "Treat the base-model iPhone 15 as the baseline device target.",
                "Branding overrides should only change colors and an explicit replacement logo while preserving universal restaurant photos, merchant banners, and merchant logos.",
                "Use local mocked JSON files for demo data.",
                "Use the spec.md in this project as your source of truth for all screens, components, and visual rules.",
            ]
        ),
    ]


def _spec_section_side_effect(app_name: str = "MyApp", reference_app: str = "TestApp"):
    by_filename = {
        section["filename"]: output
        for section, output in zip(local_worker.SPEC_SECTION_DEFINITIONS, _spec_section_outputs(app_name, reference_app))
    }

    def _respond(prompt, **kwargs):
        for filename, output in by_filename.items():
            if f"`{filename}`" in prompt:
                return output
        raise AssertionError(f"Unexpected spec section prompt: {prompt[:120]}")

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
        mock_claude_text.side_effect = _spec_section_side_effect()

        process_project("proj-uuid-1234")

        # Extraction must NOT have been called
        mock_extract.assert_not_called()
        mock_dedup.assert_not_called()

        # Section generation replaces the one-shot stitch
        self.assertEqual(mock_claude_text.call_count, len(local_worker.SPEC_SECTION_DEFINITIONS))

        update_calls = client.table.return_value.update.call_args_list
        statuses_set = [c[0][0].get("status") for c in update_calls if "status" in c[0][0]]
        self.assertIn("stitching", statuses_set)
        self.assertNotIn("extracting", statuses_set)
        self.assertNotIn("analyzing_frontend", statuses_set)
        self.assertNotIn("analyzing_backend", statuses_set)

        stored_specs = [c.args[0]["spec_md_text"] for c in update_calls if "spec_md_text" in c.args[0]]
        self.assertEqual(len(stored_specs), 1)
        self.assertTrue(stored_specs[0].startswith("# MyApp — Frontend Specification"))
        self.assertIn("## App Overview", stored_specs[0])
        self.assertIn("## Shared Components", stored_specs[0])
        self.assertIn("## Claude Code Prompt", stored_specs[0])

    # ------------------------------------------------------------------
    # 2. Invalid section output → project fails instead of storing a partial spec.
    # ------------------------------------------------------------------
    @patch.object(local_worker, "get_db")
    @patch.object(local_worker, "claude_text")
    @patch.object(local_worker, "extract_frames")
    @patch.object(local_worker, "deduplicate_frames")
    def test_invalid_section_output_marks_project_failed(
        self, mock_dedup, mock_extract, mock_claude_text, mock_get_db
    ):
        project_data = _base_project(
            frontend_spec="## Frontend",
        )
        client = _make_db_client(project_data)
        mock_get_db.return_value = client
        mock_claude_text.side_effect = lambda *args, **kwargs: "## Wrong Heading\n\nBad section"

        with self.assertRaises(RuntimeError):
            process_project("proj-uuid-5678")

        mock_extract.assert_not_called()
        mock_dedup.assert_not_called()

        update_calls = client.table.return_value.update.call_args_list
        statuses_set = [c[0][0].get("status") for c in update_calls if "status" in c[0][0]]
        self.assertIn("failed", statuses_set)
        self.assertNotIn("extracting", statuses_set)
        self.assertNotIn("analyzing_frontend", statuses_set)

    # ------------------------------------------------------------------
    # 3. No stored analysis → full frontend-only spec pipeline runs.
    # ------------------------------------------------------------------
    @patch.object(local_worker, "get_db")
    @patch.object(local_worker, "claude_text")
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
        mock_claude_text.side_effect = _spec_section_side_effect()

        process_project("proj-uuid-9999")

        # All stages must have run
        mock_extract.assert_called_once()
        mock_dedup.assert_called_once()
        self.assertEqual(mock_vision.call_count, 2)
        self.assertEqual(mock_claude_text.call_count, len(local_worker.SPEC_SECTION_DEFINITIONS))

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

        first_text_call = mock_claude_text.call_args_list[0]
        self.assertEqual(first_text_call.kwargs["system"], local_worker.SPEC_SECTION_SYSTEM)
        self.assertEqual(first_text_call.kwargs["model"], local_worker.STITCH_MODEL)

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
