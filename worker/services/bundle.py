import re
import io
import zipfile


def extract_bundle_files(spec_md: str) -> tuple[str, dict[str, str]]:
    """Parse <spectr:file> blocks out of spec_md.

    Returns (clean_spec_md, {filename: content}) where clean_spec_md has the
    entire <spectr:files>...</spectr:files> block removed.
    """
    files: dict[str, str] = {}
    pattern = r'<spectr:file (?:name|path)="([^"]+)">([\s\S]*?)</spectr:file>'
    for match in re.finditer(pattern, spec_md):
        filename = match.group(1)
        content = match.group(2).strip()
        files[filename] = content

    clean = re.sub(r'\n*<spectr:files>[\s\S]*?</spectr:files>\n*', '\n', spec_md)
    # Also strip any orphaned <spectr:file> tags (LLM may omit outer wrapper)
    clean = re.sub(r'\n*<spectr:file (?:name|path)="[^"]*">[\s\S]*?</spectr:file>\n*', '\n', clean).strip()
    return clean, files


def create_bundle_zip(spec_md: str, extra_files: dict[str, str], *, root_dir: str | None = None, include_spec: bool = True) -> bytes:
    """Create an in-memory zip with optional project root and optional spec.md."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        prefix = ""
        if root_dir:
            safe_root = root_dir.lstrip('/').replace('..', '').strip('/')
            if safe_root:
                prefix = f"{safe_root}/"
        if include_spec:
            zf.writestr(f"{prefix}spec.md", spec_md)
        for filename, content in extra_files.items():
            # Sanitize: reject path traversal attempts
            safe_name = filename.lstrip('/').replace('..', '')
            safe_name = safe_name.strip('/')
            if not safe_name:
                continue
            zf.writestr(f"{prefix}{safe_name}", content)
    return buf.getvalue()
