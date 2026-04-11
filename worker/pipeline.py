import os
import json
import shutil
import tempfile
from supabase import create_client
from dotenv import load_dotenv

from services.ffmpeg import extract_frames
from services.dedup import deduplicate_frames
from services.claude import analyze_frames_batch, research_backend, stitch_spec

load_dotenv()

MAX_FRAMES = int(os.getenv("MAX_FRAMES", 80))
BATCH_SIZE = int(os.getenv("FRAME_BATCH_SIZE", 15))
BUCKET = "spectr-uploads"


def db():
    return create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))


def update(project_id: str, data: dict):
    db().table("projects").update(data).eq("id", project_id).execute()


def run_pipeline(project_id: str):
    tmpdir = tempfile.mkdtemp(prefix=f"spectr_{project_id}_")
    try:
        _pipeline(project_id, tmpdir)
    except Exception as exc:
        update(project_id, {"status": "failed", "error_text": str(exc)})
        raise
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def _pipeline(project_id: str, tmpdir: str):
    project = db().table("projects").select("*").eq("id", project_id).single().execute().data
    reference_app = project["reference_app"]
    your_app_name = project.get("your_app_name") or reference_app
    brand_colors = project.get("brand_colors") or {}

    # STAGE 1 — Extract frames
    update(project_id, {"status": "extracting"})
    mp4_path = f"{tmpdir}/input.mp4"
    mp4_bytes = db().storage.from_(BUCKET).download(project["mp4_s3_key"])
    with open(mp4_path, "wb") as f:
        f.write(mp4_bytes)

    frames_dir = f"{tmpdir}/frames"
    all_frames = extract_frames(mp4_path, frames_dir)
    unique_frames = deduplicate_frames(all_frames)
    if len(unique_frames) > MAX_FRAMES:
        step = len(unique_frames) // MAX_FRAMES
        unique_frames = unique_frames[::step][:MAX_FRAMES]
    update(project_id, {"frame_count": len(unique_frames)})

    # STAGE 2 — Analyze frontend
    update(project_id, {"status": "analyzing_frontend"})
    batches = [unique_frames[i:i+BATCH_SIZE] for i in range(0, len(unique_frames), BATCH_SIZE)]
    screen_specs = [analyze_frames_batch(batch, reference_app) for batch in batches]
    frontend_spec = "\n\n---\n\n".join(screen_specs)
    update(project_id, {"frontend_spec": frontend_spec})

    # STAGE 3 — Research backend
    update(project_id, {"status": "analyzing_backend"})
    backend_spec = research_backend(reference_app, frontend_spec[:2000])
    update(project_id, {"backend_spec": backend_spec})

    # STAGE 4 — Stitch spec.md
    update(project_id, {"status": "stitching"})
    brand_overrides = json.dumps(brand_colors) if brand_colors else "None provided"
    spec_md = stitch_spec(
        reference_app=reference_app,
        your_app_name=your_app_name,
        brand_overrides=brand_overrides,
        frontend_spec=frontend_spec,
        backend_spec=backend_spec,
    )

    spec_key = f"{project_id}/spec.md"
    db().storage.from_(BUCKET).upload(
        path=spec_key,
        file=spec_md.encode("utf-8"),
        file_options={"content-type": "text/markdown", "upsert": "true"},
    )
    update(project_id, {"status": "complete", "spec_md_s3_key": spec_key, "spec_md_text": spec_md})
