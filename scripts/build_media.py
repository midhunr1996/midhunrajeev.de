"""Convert source photos and videos into web-ready assets under site/assets.

Videos: H.264, <= 1280 px wide, audio stripped (home recordings may contain private conversation),
faststart for streaming. Images: WebP, resized; a 720 px card thumbnail is made for each project.
Usage: python scripts/build_media.py [--images-only]
"""
import subprocess
import sys
from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None

HERE = Path(__file__).parent
RAW = HERE / "raw"
LI = Path(r"D:\ProjectsLinkedin")
E = Path("E:/")
OUT_IMG = HERE.parent / "site/assets/img"
OUT_VID = HERE.parent / "site/assets/video"
THUMB_WIDTH = 720
WEBP_QUALITY = 80

# (source, output name, max width, crop box or None)
IMAGES = [
    (RAW / "portrait.jpg", "midhun", 576, (0, 150, 576, 918)),  # About portrait, 3:4 (Oct 2026 photo)
    (RAW / "tb3_dashboard.png", "tb3-dashboard", 1280, None),
    (RAW / "tb3_architecture.png", "tb3-architecture", 1400, None),
    (LI / "labviewProteus/Picture1.jpg", "labview-panel", 1246, None),
    (LI / "labviewProteus/Picture1.png", "labview-schematic", 1400, None),
    (E / "additional_captures.png", "mr-captures", 1420, (0, 0, 1420, 495)),  # top row only
    (E / "additional_captures.png", "mr-live", 920, (10, 10, 470, 470)),
    (E / "pipeline.png", "mr-pipeline", 1479, None),
    (LI / "nuclei object Detection/final results.jpg", "mitosis-results", 1400, None),
    (LI / "nuclei object Detection/prop.jpg", "mitosis-pipeline", 1400, None),
    (LI / "segmentation/results1.png", "nuclei-results", 1200, None),
    (LI / "segmentation/operation.png", "nuclei-steps", 1400, None),
    (LI / "brst seg/proposedModel (1) (2).jpg", "brain-architecture", 1600, None),
    (LI / "brst seg/Screenshot (25).png", "brain-prediction", 1076, None),
    (LI / "expression/propmodelArch.png", "expression-architecture", 1600, (1150, 0, 8031, 3508)),  # no faces
    (LI / "heat/Temperature Contour.png", "gyroid-temperature", 1165, None),
    (LI / "heat/Gyroid Structure Created in ntopology.png", "gyroid-structure", 775, None),
    (LI / "heat/Final Results.png", "gyroid-results", 1200, None),
    (RAW / "verali_walkthrough-poster.jpg", "verali-poster", 1200, None),
    # Screenshots of the live GitHub Pages sites (captured with Playwright at 1280x800).
    (RAW / "tea-leaf.png", "tea-leaf", 1280, None),
    (RAW / "am-study.png", "am-study", 1280, None),
    (RAW / "cps-study.png", "cps-study", 1280, None),
]

# (source, output name, start seconds or None, duration or None, poster time relative to clip)
VIDEOS = [
    (E / "akbar_explainer_full (2).mp4", "akbar-explainer", None, None, 9),
    (RAW / "tb3_realTesting.mp4", "tb3-real", None, None, 3),
    (LI / "UV_sanitizingRob.mp4", "uv-robot", 72, 28, 13),
    (LI / "labviewProteus/Media2.mp4", "labview-demo", None, None, 10),
    (RAW / "verali_walkthrough.mp4", "verali-walkthrough", None, None, None),
]


def save_webp(image, name, max_width):
    image = image.convert("RGB")
    if image.width > max_width:
        image = image.resize((max_width, round(image.height * max_width / image.width)), Image.LANCZOS)
    image.save(OUT_IMG / f"{name}.webp", "WEBP", quality=WEBP_QUALITY, method=6)
    thumb = image.copy()
    if thumb.width > THUMB_WIDTH:
        thumb = thumb.resize((THUMB_WIDTH, round(thumb.height * THUMB_WIDTH / thumb.width)), Image.LANCZOS)
    thumb.save(OUT_IMG / f"{name}-thumb.webp", "WEBP", quality=WEBP_QUALITY - 6, method=6)


def build_image(source, name, max_width, crop):
    with Image.open(source) as image:
        save_webp(image.crop(crop) if crop else image, name, max_width)


def run_ffmpeg(args):
    result = subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *args], capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr.strip()}")


def build_video(source, name, start, duration, poster_at):
    trim = (["-ss", str(start)] if start is not None else []) + (["-t", str(duration)] if duration else [])
    out = OUT_VID / f"{name}.mp4"
    run_ffmpeg([*trim, "-i", str(source), "-vf", "scale='min(1280,iw)':-2", "-c:v", "libx264", "-preset", "slow",
                "-crf", "28", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(out)])
    if poster_at is None:
        return
    frame = HERE / f"raw/{name}-poster.png"
    run_ffmpeg(["-ss", str(poster_at), "-i", str(out), "-frames:v", "1", str(frame)])
    with Image.open(frame) as image:
        save_webp(image, f"{name}-poster", 1280)


def main():
    OUT_IMG.mkdir(parents=True, exist_ok=True)
    OUT_VID.mkdir(parents=True, exist_ok=True)
    missing = [str(item[0]) for item in IMAGES + VIDEOS if not Path(item[0]).exists()]
    if missing:
        sys.exit("Missing source files:\n  " + "\n  ".join(missing))
    for item in IMAGES:
        build_image(*item)
        print("image", item[1])
    if "--images-only" in sys.argv:
        return
    for item in VIDEOS:
        build_video(*item)
        print("video", item[1])


if __name__ == "__main__":
    main()
