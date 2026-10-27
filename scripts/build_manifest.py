"""Write data/bench/manifest-v1.jsonl: every benchmark clip, with its audio recipe and split.

Three passage sets:
    open        the 90-passage study set, in the four conditions it was transcribed in
    disfluency  the repeat / self-correction set (clean only)
    v2          the second-set mistake types (text only so far; audio to be rendered)

Voices for existing audio come from the TTS logs in results/, not from guesses. Speed was not
logged for those clips, so it is left empty. No API calls.

    uv run python scripts/build_manifest.py
"""

import json
import re
import sys
from pathlib import Path

from akshara.dataset import Clip, clip_id, split_of, write
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


def rows(path: Path) -> list[dict]:
    return [json.loads(x) for x in path.read_text("utf-8").splitlines() if x]


def voices_from_log(path: Path) -> dict[str, str]:
    found = re.findall(r"wrote (\S+)\.wav \((\w+)\)", path.read_text("utf-8"))
    return dict(found)


def rel(p: Path) -> str:
    return p.relative_to(ROOT).as_posix()


def clip(row: dict, *, voice, speed, conditions, audio, report, set_name) -> Clip:
    return Clip(
        clip_id=clip_id(row["id"], ENGINE, voice, conditions),
        passage_id=row["id"],
        lang=row["lang"],
        reference=row["reference"],
        read_as=row["read_as"],
        errors=row["errors"],
        engine=ENGINE,
        voice=voice,
        speed=speed,
        conditions=conditions,
        audio=audio,
        report=report,
        split=split_of(row["id"], ENGINE),
        set=set_name,
    )


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
                report=None,
                set_name="v2",
            )
        )
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
