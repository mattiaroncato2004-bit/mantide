"""Runs Gemma on every demo photo and saves the answers in demo-data/analyses.json.

The app uses these answers only as a fallback, when it cannot reach Gemma during a live demo,
and says so on screen. Usage, from the repo root, with `litert-lm serve` running:
    python3 local-ai/precompute_demo.py
"""
import json
import pathlib
import re
import subprocess
import sys
import tempfile
import time

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from test_photo import INTERESTS, analyze  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
PHOTOS = ROOT / "demo-data" / "photos"
OUT = ROOT / "demo-data" / "analyses.json"


def shrink(src: pathlib.Path, dst: pathlib.Path) -> None:
    """384 px on the long side, like the app. Uses Pillow if present, else macOS sips."""
    try:
        from PIL import Image
        with Image.open(src) as im:
            im.thumbnail((384, 384))
            im.convert("RGB").save(dst, "JPEG", quality=80)
    except ImportError:
        subprocess.run(["sips", "-Z", "384", str(src), "--out", str(dst)], check=True, capture_output=True)


def parse(text: str) -> dict | None:
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        return None
    raw = json.loads(match.group(0))
    interests = [i for i in dict.fromkeys(raw.get("interests", [])) if i in INTERESTS][:3]
    return {"scene": str(raw.get("scene", ""))[:80], "interests": interests} if interests else None


def main() -> None:
    results = json.loads(OUT.read_text()) if OUT.exists() else {}
    files = sorted(p for p in PHOTOS.glob("*.jpg") if p.name not in results)
    with tempfile.TemporaryDirectory() as tmp:
        for n, photo in enumerate(files, 1):
            small = pathlib.Path(tmp) / photo.name
            shrink(photo, small)
            start = time.time()
            try:
                answer = parse(analyze(str(small)))
            except Exception as error:  # keep going: one bad photo must not stop the batch
                print(f"{n}/{len(files)} {photo.name}: error {error}")
                continue
            if answer:
                results[photo.name] = answer
                OUT.write_text(json.dumps(results, ensure_ascii=False, indent=1) + "\n")
            print(f"{n}/{len(files)} {photo.name} {time.time() - start:.1f}s {answer}")


if __name__ == "__main__":
    main()
