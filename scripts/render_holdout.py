"""Render the held-out engine's clean clips with AI4Bharat's Indic Parler-TTS. Local, no credits.

This engine is never used for tuning or calibration (split `holdout`, `akshara.dataset`), so the
benchmark can show whether results hold for a voice the system has never heard. Instructions for
running it: docs/HOLDOUT_HOWTO.md.

Parler-TTS needs an older `transformers` than the project's `evidence` group, so this script
imports nothing from `akshara` and runs in its own throwaway environment:

    uv run --no-project --with-requirements scripts/holdout_requirements.txt \\
        python scripts/render_holdout.py --limit 2      # two clips, to check the setup
    uv run --no-project --with-requirements scripts/holdout_requirements.txt \\
        python scripts/render_holdout.py                # the rest (clips on disk are skipped)

What to say comes from data/bench/holdout_render.jsonl (written by scripts/build_manifest.py): the
text of each piece and the silence after it. As in scripts/render_manifest.py, a clip with a
planted long pause is synthesised in pieces split at that word and joined with the silence.
Each clip's random seed comes from its id, so a re-run gives the same voice choices. Output:
16 kHz mono 16-bit WAV at each clip's manifest path.
"""

import argparse
import hashlib
import json
import os
import sys
import time
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
RENDER = ROOT / "data" / "bench" / "holdout_render.jsonl"  # from scripts/build_manifest.py
MODEL_ID = "ai4bharat/indic-parler-tts"
RATE = 16000
# a plain, clean reading; the speaker name picks the voice
DESCRIPTION = (
    "{voice} speaks at a moderate pace with a clear, even voice. The recording is very close "
    "and clean, with no background noise."
)
SECONDS_PER_WORD = (0.15, 2.0)  # outside this range a clip is probably cut short or babbling


def load_env() -> None:
    """HF_HOME and HF_TOKEN from .env, without needing python-dotenv."""
    env = ROOT / ".env"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def write_wav(path: Path, x: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(x, -1.0, 1.0) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm.tobytes())


class Parler:
    def __init__(self, device: str):
        import torch
        from parler_tts import ParlerTTSForConditionalGeneration
        from transformers import AutoTokenizer

        self.torch = torch
        self.device = device
        dtype = torch.float16 if device == "cuda" else torch.float32
        self.model = ParlerTTSForConditionalGeneration.from_pretrained(
            MODEL_ID, torch_dtype=dtype
        ).to(device)
        self.tok = AutoTokenizer.from_pretrained(MODEL_ID)
        self.desc_tok = AutoTokenizer.from_pretrained(self.model.config.text_encoder._name_or_path)
        self.rate = self.model.config.sampling_rate

    def say(self, text: str, voice: str, seed: int) -> np.ndarray:
        from scipy.signal import resample_poly

        self.torch.manual_seed(seed)
        d = self.desc_tok(DESCRIPTION.format(voice=voice), return_tensors="pt").to(self.device)
        p = self.tok(text, return_tensors="pt").to(self.device)
        with self.torch.inference_mode():
            out = self.model.generate(
                input_ids=d.input_ids,
                attention_mask=d.attention_mask,
                prompt_input_ids=p.input_ids,
                prompt_attention_mask=p.attention_mask,
            )
        x = out.float().cpu().numpy().squeeze().astype(np.float64)
        g = np.gcd(RATE, self.rate)
        return resample_poly(x, RATE // g, self.rate // g)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--render-list", type=Path, default=RENDER)
    ap.add_argument("--limit", type=int, help="render at most this many clips")
    ap.add_argument("--dry-run", action="store_true", help="list what would be rendered")
    ap.add_argument("--device", help="cuda or cpu (default: cuda if available)")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    load_env()

    clips = [json.loads(x) for x in args.render_list.read_text("utf-8").splitlines() if x]
    todo = [c for c in clips if not (ROOT / c["audio"]).exists()]
    if args.limit:
        todo = todo[: args.limit]
    print(f"{len(todo)} clips to render with {MODEL_ID}")
    if args.dry_run:
        for c in todo:
            print(f"would render {c['clip_id']}: {c['pieces']}")
        return

    import torch

    device = args.device or ("cuda" if torch.cuda.is_available() else "cpu")
    print(f"loading the model on {device} (first run downloads about 4 GB)")
    tts = Parler(device)
    t0 = time.time()
    for n, c in enumerate(todo, 1):
        seed = int(hashlib.sha256(c["clip_id"].encode()).hexdigest()[:8], 16)
        parts = []
        for k, (text, silence) in enumerate(c["pieces"]):
            if text:
                parts.append(tts.say(text, c["voice"], seed + k))
            parts.append(np.zeros(int(silence * RATE)))
        x = np.concatenate(parts)
        peak = np.abs(x).max()
        if peak > 0:
            x = x * (0.9 / peak)
        write_wav(ROOT / c["audio"], x)
        secs = len(x) / RATE
        n_words = c["words"]
        lo, hi = SECONDS_PER_WORD
        warn = "" if lo * n_words <= secs <= hi * n_words else "  CHECK: unusual length"
        print(
            f"[{n}/{len(todo)}] wrote {c['audio']} ({c['voice']}, {secs:.1f} s, "
            f"{n_words} words, {time.time() - t0:.0f} s so far){warn}"
        )


if __name__ == "__main__":
    main()
