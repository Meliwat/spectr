import os
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.mobile_scaffold import (
    _run_command,
    build_fixed_mobile_files,
    build_route_manifest,
    ensure_locked_mobile_files,
    extract_scaffold_api,
    merge_files,
    prevalidate_mobile_project,
)


def test_run_command_returns_timeout_error_text(tmp_path: Path):
    with patch("services.mobile_scaffold.subprocess.run") as mock_run:
        mock_run.side_effect = subprocess.TimeoutExpired(
            cmd=["npx", "expo", "export"],
            timeout=600,
            output="partial output",
            stderr="still working",
        )

        ok, output = _run_command(["npx", "expo", "export"], cwd=tmp_path, timeout=600)

    assert ok is False
    assert "timed out after 600s" in output
    assert "partial output" in output
    assert "still working" in output


def test_build_fixed_mobile_files_includes_core_components_and_fallback():
    files = build_fixed_mobile_files(
        "Spectr Demo",
        "DoorDash",
        [{"name": "Home", "route": "/", "file_path": "app/index.tsx"}],
        {"tables": [{"name": "restaurants", "columns": [{"name": "id", "type": "uuid", "constraints": ["primary key"]}], "foreign_keys": []}]},
    )

    assert "src/components/AppText.tsx" in files
    assert "src/components/AppScreen.tsx" in files
    assert "src/components/SearchBar.tsx" in files
    assert "src/components/SectionHeader.tsx" in files
    assert "src/components/SectionCard.tsx" in files
    assert "src/components/BottomTabBar.tsx" in files
    assert "src/components/FoodImage.tsx" in files
    assert "src/lib/fallback.ts" in files
    assert "assets/.keep" in files
    assert "export const Colors" in files["src/theme/tokens.ts"]
    assert '"@expo/vector-icons"' in files["package.json"]
    assert '"babel-preset-expo"' in files["package.json"]
    assert '"react-dom"' in files["package.json"]
    assert '"react-native-web"' in files["package.json"]


def test_merge_files_does_not_override_locked_mobile_templates():
    merged = merge_files(
        {
            "src/components/AppText.tsx": "fixed",
            "src/lib/fallback.ts": "fixed fallback",
            "app/index.tsx": "base screen",
        },
        {
            "src/components/AppText.tsx": "generated",
            "src/lib/fallback.ts": "generated fallback",
            "app/index.tsx": "generated screen",
        },
    )

    assert merged["src/components/AppText.tsx"] == "fixed"
    assert merged["src/lib/fallback.ts"] == "fixed fallback"
    assert merged["app/index.tsx"] == "generated screen"


def test_extract_scaffold_api_includes_component_interfaces_helpers_tokens_and_routes():
    route_manifest = build_route_manifest(
        [
            {"name": "Home", "route": "/", "purpose": "Landing", "states": [], "actions": []},
            {"name": "Store", "route": "/stores/[id]", "purpose": "Detail", "states": [], "actions": []},
        ]
    )
    files = build_fixed_mobile_files(
        "Spectr Demo",
        "DoorDash",
        route_manifest,
        {"tables": [{"name": "restaurants", "columns": [{"name": "id", "type": "uuid", "constraints": ["primary key"]}], "foreign_keys": []}]},
    )

    api = extract_scaffold_api(files, route_manifest)

    assert "export interface SectionHeaderProps" in api
    assert "export type QueryOptions<T>" in api
    assert "export async function listRows" in api
    assert "- Colors" in api
    assert "app/stores/[id].tsx" in api
    assert "params: id" in api


def test_ensure_locked_mobile_files_restores_missing_scaffold_files():
    files = build_fixed_mobile_files(
        "Spectr Demo",
        "DoorDash",
        [{"name": "Home", "route": "/", "file_path": "app/index.tsx", "route_key": "home", "params": []}],
        {"tables": [{"name": "restaurants", "columns": [{"name": "id", "type": "uuid", "constraints": ["primary key"]}], "foreign_keys": []}]},
    )
    partial = {k: v for k, v in files.items() if k not in {"src/lib/fallback.ts", "assets/.keep"}}

    restored_files, restored = ensure_locked_mobile_files(partial, files)

    assert sorted(restored) == ["assets/.keep", "src/lib/fallback.ts"]
    assert restored_files["src/lib/fallback.ts"] == files["src/lib/fallback.ts"]
    assert "assets/.keep" in restored_files


def test_prevalidate_mobile_project_rejects_route_imports_of_raw_data_contracts():
    route_manifest = build_route_manifest(
        [{"name": "Home", "route": "/", "purpose": "Landing", "states": [], "actions": []}]
    )
    files = build_fixed_mobile_files(
        "Spectr Demo",
        "DoorDash",
        route_manifest,
        {"tables": [{"name": "restaurants", "columns": [{"name": "id", "type": "uuid", "constraints": ["primary key"]}], "foreign_keys": []}]},
    )
    files["src/lib/view-models.ts"] = "export async function loadHomeScreenData(){ return { title: 'Home' } }\n"
    files["app/index.tsx"] = (
        "import { dataMode } from '@/src/lib/data'\n"
        "import { loadHomeScreenData } from '@/src/lib/view-models'\n"
        "export default function Home(){ return null }\n"
    )

    validation = prevalidate_mobile_project(files, route_manifest, build_fixed_mobile_files(
        "Spectr Demo",
        "DoorDash",
        route_manifest,
        {"tables": [{"name": "restaurants", "columns": [{"name": "id", "type": "uuid", "constraints": ["primary key"]}], "foreign_keys": []}]},
    ))

    assert validation["ok"] is False
    assert "may not import src/lib/data.ts directly" in validation["errors"]
    assert validation["failing_files"] == ["app/index.tsx"]
