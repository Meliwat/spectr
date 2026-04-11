import imagehash
from PIL import Image


def deduplicate_frames(frame_paths: list[str], threshold: int = 8) -> list[str]:
    seen, unique = [], []
    for path in frame_paths:
        try:
            h = imagehash.phash(Image.open(path))
            if all(abs(h - s) > threshold for s in seen):
                unique.append(path)
                seen.append(h)
        except Exception:
            continue
    return unique
