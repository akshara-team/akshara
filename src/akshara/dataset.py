"""Benchmark clips: what was read, how the audio was made, and which split each clip is in.

A manifest is a JSONL file of clips. It describes audio rather than containing it: rebuilding a
clip from its record gives the same audio (all audio steps are seeded and cached), and a clip
whose audio has not been rendered yet is still a valid entry.

Splits keep tuning honest:
    tune       pick features and rules
    calibrate  fit thresholds and confidence
    test       report numbers
    holdout    audio from an engine never used for tune or calibrate: the stand-in for
               "a voice the system has never heard", our best proxy for real children

The split is decided by the passage's family (a passage and its variants share one), so the same
text never appears in two splits.
"""

import hashlib
import json
from dataclasses import asdict, dataclass, field
from pathlib import Path

from akshara.core.text import words

SPLITS = (("tune", 0.6), ("calibrate", 0.2), ("test", 0.2))
# Engines kept out of tuning and calibration: only ever scored, never fitted on.
HOLDOUT_ENGINE = "indic-parler-tts"  # AI4Bharat's open TTS, rendered by scripts/render_holdout.py
HOLDOUT_ENGINES: frozenset[str] = frozenset({HOLDOUT_ENGINE})
_SUFFIXES = ("-ok", "-m", "-d", "-v2")


@dataclass
class Clip:
    clip_id: str
    passage_id: str
    lang: str
    reference: str
    read_as: str
    errors: list[dict]
    engine: str  # "timbre-v3.0", or "none" when only the text exists
    voice: str | None
    speed: float | None  # None when not recorded
    conditions: list[str] = field(default_factory=list)  # applied in order, e.g. ["phone8k"]
    audio: str | None = None  # path relative to the repo root
    report: str | None = None  # committed study report holding this clip's transcript
    split: str = ""
    set: str = ""  # which passage set: "open", "disfluency", "v2"


def family(passage_id: str) -> str:
    """Passage id without variant suffixes: sw-205058-d and sw-205058 are one family."""
    for suffix in _SUFFIXES:
        if passage_id.endswith(suffix):
            return passage_id[: -len(suffix)]
    return passage_id


def split_of(passage_id: str, engine: str, holdout: frozenset[str] = HOLDOUT_ENGINES) -> str:
    if engine in holdout:
        return "holdout"
    h = int(hashlib.sha256(f"split:{family(passage_id)}".encode()).hexdigest()[:8], 16) / 16**8
    edge = 0.0
    for name, share in SPLITS:
        edge += share
        if h < edge:
            return name
    return SPLITS[-1][0]


def clip_id(passage_id: str, engine: str, voice: str | None, conditions: list[str]) -> str:
    cond = "+".join(conditions) or "clean"
    return f"{passage_id}@{engine}:{voice or '-'}:{cond}"


def write(path: Path, clips: list[Clip]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "".join(json.dumps(asdict(c), ensure_ascii=False) + "\n" for c in clips),
        encoding="utf-8",
    )


def load(path: Path) -> list[Clip]:
    lines = path.read_text(encoding="utf-8").splitlines()
    return [Clip(**json.loads(line)) for line in lines if line]


def spoken_by_word(clip: Clip) -> list[str]:
    """What the reader says for each story word ("" for a skip); joins back to read_as."""
    out = list(words(clip.reference))
    for e in clip.errors:
        out[e["index"]] = e.get("said", "")
    if " ".join(w for w in out if w) != clip.read_as:
        raise ValueError(f"{clip.clip_id}: errors do not rebuild read_as")
    return out


def pieces(clip: Clip) -> list[tuple[str, float]]:
    """(text, silence after it in seconds) for each piece to synthesise."""
    spoken = spoken_by_word(clip)
    pauses = {e["index"]: e["pause_s"] for e in clip.errors if e["type"] == "hesitation"}
    out, current = [], []
    for i, w in enumerate(spoken):
        if i in pauses and current:
            out.append((" ".join(current), pauses[i]))
            current = []
        if w:
            current.append(w)
    out.append((" ".join(current), 0.0))
    return out
