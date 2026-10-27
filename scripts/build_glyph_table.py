"""Build the table of letters that look alike, per script, from rendered glyphs.

No labelled data: each letter is drawn in several fonts, cropped, scaled, blurred, and compared
with every other letter of the same script by cosine similarity. Scores are averaged over fonts so
one font's style does not decide. The result feeds "visual confusion" mistake planting and is
reviewed by native speakers (docs/review/SCRIPT_TABLES.md).

Fonts: Nirmala UI (Windows) when present, plus Noto Sans and Noto Serif for each script
(SIL Open Font License), downloaded once into data/fonts/ (git-ignored).

    uv run python scripts/build_glyph_table.py
"""

import hashlib
import json
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter

from akshara.core.script import LANGS, consonants, independent_vowels

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "data" / "fonts"
OUT = ROOT / "src" / "akshara" / "core" / "tables" / "glyph_similarity.json"
NIRMALA = Path("C:/Windows/Fonts/Nirmala.ttc")
_GF = "https://github.com/google/fonts/raw/main/ofl"
NOTO = {
    "hi-IN": [
        f"{_GF}/notosansdevanagari/NotoSansDevanagari%5Bwdth,wght%5D.ttf",
        f"{_GF}/notoserifdevanagari/NotoSerifDevanagari%5Bwdth,wght%5D.ttf",
    ],
    "kn-IN": [
        f"{_GF}/notosanskannada/NotoSansKannada%5Bwdth,wght%5D.ttf",
        f"{_GF}/notoserifkannada/NotoSerifKannada%5Bwght%5D.ttf",
    ],
    "ta-IN": [
        f"{_GF}/notosanstamil/NotoSansTamil%5Bwdth,wght%5D.ttf",
        f"{_GF}/notoseriftamil/NotoSerifTamil%5Bwdth,wght%5D.ttf",
    ],
}
SIZE, CELL, BLUR, KEEP = 96, 48, 1.5, 4


def fetch(url: str) -> Path:
    path = FONT_DIR / url.rsplit("/", 1)[1].replace("%5B", "[").replace("%5D", "]")
    if not path.exists():
        FONT_DIR.mkdir(parents=True, exist_ok=True)
        print(f"downloading {path.name}")
        urllib.request.urlretrieve(url, path)
    return path


def render(ch: str, font: ImageFont.FreeTypeFont) -> np.ndarray | None:
    img = Image.new("L", (SIZE * 3, SIZE * 3), 0)
    ImageDraw.Draw(img).text((SIZE * 1.5, SIZE * 1.5), ch, fill=255, font=font, anchor="mm")
    box = img.getbbox()
    if not box:
        return None
    glyph = img.crop(box)
    scale = (CELL - 4) / max(glyph.size)  # keep the aspect ratio, fit inside the cell
    glyph = glyph.resize(
        (max(1, round(glyph.width * scale)), max(1, round(glyph.height * scale))),
        Image.Resampling.LANCZOS,
    )
    cell = Image.new("L", (CELL, CELL), 0)
    cell.paste(glyph, ((CELL - glyph.width) // 2, (CELL - glyph.height) // 2))
    x = gaussian_filter(np.asarray(cell, dtype=np.float64) / 255.0, BLUR).ravel()
    return x / (np.linalg.norm(x) or 1.0)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    table: dict[str, dict[str, list]] = {}
    fonts_meta: dict[str, list[dict]] = {}
    for lang in LANGS:
        paths = [fetch(u) for u in NOTO[lang]]
        if NIRMALA.exists():
            paths.insert(0, NIRMALA)
        letters = [*consonants(lang), *independent_vowels(lang)]
        sims = []
        for path in paths:
            font = ImageFont.truetype(str(path), SIZE)
            vecs = [render(ch, font) for ch in letters]
            if any(v is None for v in vecs):
                missing = [ch for ch, v in zip(letters, vecs, strict=True) if v is None]
                raise SystemExit(f"{path.name} cannot draw {missing}")
            m = np.stack(vecs)
            sims.append(m @ m.T)
        mean = np.mean(sims, axis=0)
        table[lang] = {}
        for i, ch in enumerate(letters):
            order = [j for j in np.argsort(-mean[i]) if j != i][:KEEP]
            table[lang][ch] = [[letters[j], round(float(mean[i, j]), 3)] for j in order]
        fonts_meta[lang] = [
            {"file": p.name, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()[:16]}
            for p in paths
        ]
        top = sorted(
            ((s, a, b) for a, rows in table[lang].items() for b, s in rows[:1] if a < b),
            reverse=True,
        )[:8]
        print(lang, " ".join(f"{a}~{b} {s:.2f}" for s, a, b in top))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "method": f"render {SIZE}px, crop, fit {CELL}px cell, blur {BLUR}, cosine, "
                "mean over fonts",
                "fonts": fonts_meta,
                "letters": table,
            },
            ensure_ascii=False,
            indent=1,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
