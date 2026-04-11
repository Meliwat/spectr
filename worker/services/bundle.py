import re
import io
import zipfile


def extract_bundle_files(spec_md: str) -> tuple[str, dict[str, str]]:
    """Parse <spectr:file> blocks out of spec_md.

    Returns (clean_spec_md, {filename: content}) where clean_spec_md has the
    entire <spectr:files>...</spectr:files> block removed.
    """
    files: dict[str, str] = {}
    pattern = r'<spectr:file name="([^"]+)">([\s\S]*?)</spectr:file>'
    for match in re.finditer(pattern, spec_md):
        filename = match.group(1)
        content = match.group(2).strip()
        files[filename] = content

    clean = re.sub(r'\n*<spectr:files>[\s\S]*?</spectr:files>\n*', '\n', spec_md).strip()
    return clean, files


def create_bundle_zip(spec_md: str, extra_files: dict[str, str]) -> bytes:
    """Create an in-memory zip with spec.md at root plus any extra files."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('spec.md', spec_md)
        for filename, content in extra_files.items():
            zf.writestr(filename, content)
    return buf.getvalue()
