"""Write data/bench/manifest-v1.jsonl: every benchmark clip, with its audio recipe and split.

Three passage sets:
    open        the 90-passage study set, in the four conditions it was transcribed in
    disfluency  the repeat / self-correction set (clean only)
    v2          the second-set mistake types (audio by scripts/render_manifest.py)

Plus the held-out engine: every `test` passage again, read by Indic Parler-TTS
(scripts/render_holdout.py), in the same four conditions. These clips get split `holdout` and are
never used to fit anything. Their passages are also written to data/bench/passages_holdout.jsonl,
the input scripts/go_no_go.py needs to transcribe them, and the text to synthesise for each clean
clip to data/bench/holdout_render.jsonl, so scripts/render_holdout.py needs nothing from akshara.

Voices for existing audio come from the TTS logs in results/, not from guesses. Speed was not
logged for those clips, so it is left empty. No API calls.

    uv run python scripts/build_manifest.py
"""

import json
import re
import sys
from pathlib import Path

from akshara.core.text import words
from akshara.dataset import HOLDOUT_ENGINE, Clip, clip_id, pieces, split_of, write
from akshara.providers.timbre import VOICES

ROOT = Path(__file__).resolve().parent.parent
OPEN = ROOT / "data" / "open_passages"
OUT = ROOT / "data" / "bench" / "manifest-v1.jsonl"
ENGINE = "timbre-v3.0"
OPEN_CONDITIONS = {  # condition: (audio folder, committed report)
    "": ("audio", "go_no_go_open_base.json"),
    "phone8k": ("variants/phone8k", "go_no_go_open_phone8k.json"),
    "noise5": ("variants/noise5", "go_no_go_open_noise5.json"),
    "child4": ("variants/child4", "go_no_go_open_child4.json"),
}
V2_SPEED = 0.9
V2_REPORT = "results/go_no_go_v2.json"
HOLDOUT_DIR = "data/bench/audio/" + HOLDOUT_ENGINE
HOLDOUT_PASSAGES = ROOT / "data" / "bench" / "passages_holdout.jsonl"
HOLDOUT_RENDER = ROOT / "data" / "bench" / "holdout_render.jsonl"  # read by render_holdout.py
# Parler-TTS speaker names recommended for each language on the model card
HOLDOUT_VOICES = {"hi-IN": ("Rohit", "Divya"), "kn-IN": ("Suresh", "Anu"), "ta-IN": ("Jaya",)}
HOLDOUT_CONDITIONS = ("", "phone8k", "noise5", "child4")


def rows(path: Path) -> list[dict]:
    return [json.loads(x) for x in path.read_text("utf-8").splitlines() if x]


def voices_from_log(path: Path) -> dict[str, str]:
    found = re.findall(r"wrote (\S+)\.wav \((\w+)\)", path.read_text("utf-8"))
    return dict(found)


def rel(p: Path) -> str:
    return p.relative_to(ROOT).as_posix()


def clip(row: dict, *, voice, speed, conditions, audio, report, set_name, engine=ENGINE) -> Clip:
    return Clip(
        clip_id=clip_id(row["id"], engine, voice, conditions),
        passage_id=row["id"],
        lang=row["lang"],
        reference=row["reference"],
        read_as=row["read_as"],
        errors=row["errors"],
        engine=engine,
        voice=voice,
        speed=speed,
        conditions=conditions,
        audio=audio,
        report=report,
        split=split_of(row["id"], engine),
        set=set_name,
    )


def holdout(clips: list[Clip]) -> list[Clip]:
    """The `test` passages again, read by the held-out engine, in the four conditions."""
    test = [c for c in clips if c.split == "test" and not c.conditions]
    rows_out, out = [], []
    per_lang: dict[str, int] = {}
    for c in test:
        row = {
            "id": c.passage_id,
            "lang": c.lang,
            "reference": c.reference,
            "read_as": c.read_as,
            "errors": c.errors,
        }
        rows_out.append(row)
        n = per_lang.get(c.lang, 0)
        per_lang[c.lang] = n + 1
        voices = HOLDOUT_VOICES[c.lang]
        voice = voices[n % len(voices)]
        for cond in HOLDOUT_CONDITIONS:
            folder = f"{HOLDOUT_DIR}/variants/{cond}" if cond else HOLDOUT_DIR
            report = f"results/go_no_go_holdout_{cond or 'clean'}.json"
            out.append(
                clip(
                    row,
                    voice=voice,
                    speed=None,
                    conditions=[cond] if cond else [],
                    audio=f"{folder}/{c.passage_id}.wav",
                    report=report if (ROOT / report).exists() else None,
                    set_name=c.set,
                    engine=HOLDOUT_ENGINE,
                )
            )
    render = [
        {
            "clip_id": c.clip_id,
            "voice": c.voice,
            "audio": c.audio,
            "pieces": pieces(c),
            "words": len(words(c.read_as)),
        }
        for c in out
        if not c.conditions
    ]
    HOLDOUT_RENDER.write_text(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in render), encoding="utf-8"
    )
    HOLDOUT_PASSAGES.write_text(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows_out), encoding="utf-8"
    )
    return out


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    clips: list[Clip] = []
    voices = voices_from_log(ROOT / "results" / "open_tts.log")
    for row in rows(OPEN / "passages.jsonl"):
        for cond, (folder, report) in OPEN_CONDITIONS.items():
            conditions = [cond] if cond else []
            clips.append(
                clip(
                    row,
                    voice=voices.get(row["id"]),
                    speed=None,
                    conditions=conditions,
                    audio=rel(OPEN / folder / f"{row['id']}.wav"),
                    report=f"results/{report}",
                    set_name="open",
                )
            )
    voices = voices_from_log(ROOT / "results" / "disfluency_tts.log")
    for row in rows(OPEN / "disfluency.jsonl"):
        clips.append(
            clip(
                row,
                voice=voices.get(row["id"]),
                speed=None,
                conditions=[],
                audio=rel(OPEN / "disfluency_audio" / f"{row['id']}.wav"),
                report="results/go_no_go_open_disfluency.json",
                set_name="disfluency",
            )
        )
    for i, row in enumerate(rows(ROOT / "data" / "bench" / "passages_v2.jsonl")):
        voice = VOICES[i % len(VOICES)]
        clips.append(
            clip(
                row,
                voice=voice,
                speed=V2_SPEED,
                conditions=[],
                audio=f"data/bench/audio/{ENGINE}/{row['id']}.wav",
                report=V2_REPORT if (ROOT / V2_REPORT).exists() else None,
                set_name="v2",
            )
        )
    clips += holdout(clips)
    write(OUT, clips)
    by: dict[tuple[str, str], int] = {}
    for c in clips:
        by[(c.set, c.split)] = by.get((c.set, c.split), 0) + 1
    missing_voice = sum(c.voice is None for c in clips)
    print(f"wrote {rel(OUT)}: {len(clips)} clips; voice unknown for {missing_voice}")
    for (s, sp), n in sorted(by.items()):
        print(f"  {s:<11} {sp:<10} {n}")


if __name__ == "__main__":
    main()
