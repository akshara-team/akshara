"""Ask Evon for practice sentences, one skill at a time, and keep only those that pass every check.

    uv run python scripts/evon_sentences.py --dry-run          # targets and prompts, no calls
    EVON_BASE_URL=http://host:8000/v1 uv run python scripts/evon_sentences.py --lang kn-IN

Evon is self-hosted (docs/EVON_HOWTO.md), so this spends no Gnani credits. Skills the story
bank already covers are skipped unless --all. Passing sentences are appended to
data/practice/sentences.jsonl (each still needs a teacher's approval in the app); the pass
rate per language goes to results/evon_sentences_report.json.
"""

import argparse
import json
import sys
import time
from collections import Counter
from pathlib import Path

from akshara import passages
from akshara.api.app import PASSAGES, SOURCES
from akshara.content import sentences as S
from akshara.learner import tutor
from akshara.providers.evon import EvonError, chat

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "practice" / "sentences.jsonl"
REPORT = ROOT / "results" / "evon_sentences_report.json"


def existing() -> dict[str, dict]:
    if not OUT.exists():
        return {}
    rows = [json.loads(line) for line in OUT.read_text(encoding="utf-8").splitlines() if line]
    return {r["id"]: r for r in rows}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", choices=sorted(S.LANGUAGE_NAMES), action="append")
    ap.add_argument("--per-skill", type=int, default=2, help="passing sentences wanted per skill")
    ap.add_argument("--tries", type=int, default=3, help="Evon replies per skill, at most")
    ap.add_argument("--limit", type=int, default=0, help="skills per language (0 = all)")
    ap.add_argument("--all", action="store_true", help="also skills the stories already cover")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")  # Indian scripts on a Windows console
    sys.stderr.reconfigure(encoding="utf-8")

    bank = passages.load(PASSAGES, SOURCES)
    kept = existing()
    report: dict = {"model": None, "languages": {}}
    for lang in args.lang or sorted(S.LANGUAGE_NAMES):
        lib = tutor.library(bank, lang)
        cur, texts = lib.curriculum, list(lib.texts)
        stories = S.story_sentences(texts)
        skills = [s.id for s in cur.skills if not s.id.startswith("length:")]
        targets = []
        for skill in skills:
            t = S.Target(lang, skill, S.examples(cur, skill, texts))
            if not t.examples:
                continue  # nothing to show Evon what the sound looks like in a word
            covered = any(not S.problems(x, t, cur) for x in stories)
            if args.all or not covered:
                targets.append(t)
        if args.limit:
            targets = targets[: args.limit]
        print(f"{lang}: {len(targets)} skills to ask for", file=sys.stderr)
        if args.dry_run:
            for t in targets[:3]:
                print(json.dumps({"skill": t.skill, "messages": S.prompt(t)}, ensure_ascii=False))
            continue

        stats = Counter()
        why: Counter[str] = Counter()
        for t in targets:
            messages, good = S.prompt(t), []
            for _ in range(args.tries):
                try:
                    reply = chat(messages)
                except EvonError as e:
                    print(f"  {t.skill}: {e}", file=sys.stderr)
                    return 1
                stats["replies"] += 1
                found = S.parse(reply)
                if found is None:
                    stats["no_json"] += 1
                    again = S.retry_message(["the reply was not the JSON asked for"])
                    messages = [*messages, {"role": "assistant", "content": reply}, again]
                    continue
                bad = []
                for text in found:
                    stats["sentences"] += 1
                    p = S.problems(text, t, cur)
                    if p:
                        bad += p
                        why.update(x.split(":")[0] for x in p)
                    elif text not in good:
                        good.append(text)
                        stats["passed"] += 1
                if len(good) >= args.per_skill:
                    break
                messages = [*messages, {"role": "assistant", "content": reply},
                            S.retry_message(bad or ["too few sentences"])]  # fmt: skip
            stats["skills"] += 1
            stats["skills_filled"] += bool(good)
            for text in good[: args.per_skill]:
                sid = S.sentence_id(lang, text)
                kept.setdefault(sid, {
                    "id": sid, "lang": lang, "skill": t.skill, "text": text, "source": "evon",
                    "generated_at": time.strftime("%Y-%m-%d"),
                })  # fmt: skip
            print(f"  {t.skill}: {len(good)} passed", file=sys.stderr)
        report["languages"][lang] = {
            **stats,
            "pass_rate": round(stats["passed"] / stats["sentences"], 3)
            if stats["sentences"]
            else None,
            "failed_because": dict(why.most_common()),
        }

    if args.dry_run:
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    rows = sorted(kept.values(), key=lambda r: (r["lang"], r["skill"], r["id"]))
    OUT.write_text(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows),
        encoding="utf-8",
        newline="\n",
    )
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(rows)} sentences) and {REPORT.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
