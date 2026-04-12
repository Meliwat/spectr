import zipfile
import io
import pytest
from services.bundle import extract_bundle_files, create_bundle_zip


SPEC_WITH_FILES = """# MyApp — Full Stack Specification

## App Overview
A social fitness app.

<spectr:files>
<spectr:file name=".env.example">
# Supabase — supabase.com → Settings → API
SUPABASE_URL=
SUPABASE_ANON_KEY=
</spectr:file>
<spectr:file name="setup.sh">
#!/bin/bash
cp .env.example .env
echo "done"
</spectr:file>
</spectr:files>"""

SPEC_WITH_PATH_FILES = """# MyApp

<spectr:files>
<spectr:file path="app/index.tsx">
export default function Index() { return null }
</spectr:file>
</spectr:files>"""

SPEC_WITHOUT_FILES = """# MyApp — Full Stack Specification

## App Overview
A social fitness app."""


def test_extract_returns_files():
    clean, files = extract_bundle_files(SPEC_WITH_FILES)
    assert ".env.example" in files
    assert "setup.sh" in files


def test_extract_env_content():
    _, files = extract_bundle_files(SPEC_WITH_FILES)
    assert "SUPABASE_URL=" in files[".env.example"]
    assert "SUPABASE_ANON_KEY=" in files[".env.example"]


def test_extract_strips_xml_from_spec():
    clean, _ = extract_bundle_files(SPEC_WITH_FILES)
    assert "<spectr:files>" not in clean
    assert "<spectr:file" not in clean
    assert "## App Overview" in clean


def test_extract_no_files_returns_empty():
    clean, files = extract_bundle_files(SPEC_WITHOUT_FILES)
    assert files == {}
    assert clean == SPEC_WITHOUT_FILES


def test_extract_supports_path_attribute():
    clean, files = extract_bundle_files(SPEC_WITH_PATH_FILES)
    assert "app/index.tsx" in files
    assert "<spectr:file" not in clean


def test_create_bundle_contains_spec():
    zip_bytes = create_bundle_zip("# MyApp", {})
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        assert "spec.md" in zf.namelist()
        assert zf.read("spec.md").decode() == "# MyApp"


def test_create_bundle_contains_extra_files():
    extra = {".env.example": "SUPABASE_URL=\n", "setup.sh": "#!/bin/bash\n"}
    zip_bytes = create_bundle_zip("# MyApp", extra)
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        assert ".env.example" in zf.namelist()
        assert "setup.sh" in zf.namelist()
        assert zf.read(".env.example").decode() == "SUPABASE_URL=\n"


def test_create_bundle_empty_extra_files():
    zip_bytes = create_bundle_zip("# spec", {})
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        assert zf.namelist() == ["spec.md"]


def test_extract_orphaned_file_tags_stripped_from_spec():
    """LLM may omit outer <spectr:files> wrapper — XML should still be stripped from clean."""
    spec = """# MyApp\n\n<spectr:file name=".env.example">\nSUPABASE_URL=\n</spectr:file>"""
    clean, files = extract_bundle_files(spec)
    assert "<spectr:file" not in clean
    assert ".env.example" in files


def test_create_bundle_path_traversal_sanitized():
    """Filenames with path traversal should be sanitized."""
    extra = {"../evil.sh": "rm -rf /", ".env.example": "KEY=val"}
    zip_bytes = create_bundle_zip("# spec", extra)
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        names = zf.namelist()
        assert "../evil.sh" not in names
        assert ".env.example" in names


def test_create_bundle_supports_project_root_without_spec():
    extra = {"app/index.tsx": "export default null"}
    zip_bytes = create_bundle_zip("", extra, root_dir="sample-app", include_spec=False)
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        assert "sample-app/app/index.tsx" in zf.namelist()
        assert "sample-app/spec.md" not in zf.namelist()
