"""Build the 60 s silent demo video from slides and two real screenshots of the app.

    uv run --with pillow --with imageio-ffmpeg python scripts/make_demo_video.py

Writes docs/demo/akshara_demo.mp4. Numbers are read from the saved results, not typed.
"""

import json
import subprocess
import tempfile
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DEMO = ROOT / "docs" / "demo"
W, H = 1280, 720
BG, FG, MUTED, ACC = (251, 250, 247), (29, 29, 27), (107, 106, 100), (27, 127, 59)
FONT = "C:/Windows/Fonts/segoeui.ttf"
BOLD = "C:/Windows/Fonts/segoeuib.ttf"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(BOLD if bold else FONT, size)


def pooled(name: str) -> dict[str, str]:
    d = json.loads((ROOT / "results" / name).read_text(encoding="utf-8"))
    out: dict[str, list[int]] = {}
    for r in d["summary"]["loose"].values():
        for k, v in r["by_type"].items():
            c = out.setdefault(k, [0, 0])
            c[0] += v["caught"]
            c[1] += v["planted"]
    return {k: f"{a}/{b}" for k, (a, b) in out.items()}


def slide(
    lines: list[tuple[str, int, bool]], image: str | None = None, caption: str = ""
) -> Image.Image:
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    y = 60
    for text, size, bold in lines:
        label, _, num = text.partition("	")
        d.text((70, y), label, font=font(size, bold), fill=FG if bold else MUTED)
        if num:
            d.text((720, y), num, font=font(size, True), fill=FG)
        y += int(size * 1.5)
    if image:
        shot = Image.open(DEMO / image)
        shot.thumbnail((1100, H - y - 90))
        im.paste(shot, ((W - shot.width) // 2, y + 10))
    if caption:
        d.text((70, H - 70), caption, font=font(26), fill=ACC)
    return im


def main() -> None:
    base = pooled("go_no_go_open_base.json")
    slides: list[tuple[Image.Image, float]] = [
        (
            slide(
                [
                    ("Akshara", 72, True),
                    ("A reading screener for Kannada, Tamil and Hindi", 34, False),
                    ("Built on Gnani Prisma v2.5 and Timbre v3.0", 28, False),
                    ("All test audio is synthetic. No real children.", 28, False),
                ]
            ),
            6,
        ),
        (
            slide(
                [
                    ("The question", 52, True),
                    ("A speech-to-text system writes the word the child meant.", 32, False),
                    ("Does it hide the mistakes a teacher needs to see?", 32, False),
                ]
            ),
            7,
        ),
        (
            slide(
                [
                    ("The screen", 44, True),
                    ("Read aloud. Green: read correctly. Red: skipped or different.", 28, False),
                ],
                "app_words.jpg",
                "Planted mistakes turn red",
            ),
            9,
        ),
        (
            slide(
                [
                    ("The trace", 44, True),
                    ("Every word, what was heard, and the result.", 28, False),
                ],
                "app_trace.jpg",
                "Every result carries an honest note",
            ),
            9,
        ),
        (
            slide(
                [
                    ("What we measured (90 passages, 156 planted mistakes)", 40, True),
                    (f"Skipped word caught:	{base['skip']}", 34, False),
                    (f"Unrelated word caught:	{base['distant']}", 34, False),
                    (f"First half of a word caught:	{base['half']}", 34, False),
                    (f"One consonant changed caught:	{base['near']}", 34, True),
                ],
                caption="Same pattern on phone, noisy and child-pitch audio",
            ),
            12,
        ),
        (
            slide(
                [
                    ("We tried to fix it", 48, True),
                    ("A pause-based re-check: no gain, so it is not in the product.", 32, False),
                    ("The app says so instead: green does not prove a perfect reading.", 32, False),
                    ("Limits: synthetic voices, small samples, no native review.", 28, False),
                ]
            ),
            10,
        ),
        (
            slide(
                [
                    ("Akshara", 64, True),
                    ("Method, numbers and code in the repo", 32, False),
                    ("#GnaniAI  #GreatIndianAIInternshipChallenge", 30, False),
                ]
            ),
            7,
        ),
    ]
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        concat = []
        for i, (im, secs) in enumerate(slides):
            p = Path(tmp) / f"s{i}.png"
            im.save(p)
            concat += [f"file '{p.as_posix()}'", f"duration {secs}"]
        concat.append(f"file '{(Path(tmp) / f's{len(slides) - 1}.png').as_posix()}'")
        lst = Path(tmp) / "list.txt"
        lst.write_text("\n".join(concat), encoding="utf-8")
        out = DEMO / "akshara_demo.mp4"
        subprocess.run(
            [ffmpeg, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst),
             "-vf", "fps=24,format=yuv420p", "-movflags", "+faststart", str(out)],
            check=True,
        )  # fmt: skip
    print(f"wrote {out} ({out.stat().st_size // 1024} KB, {sum(s for _, s in slides):.0f} s)")


if __name__ == "__main__":
    main()
