"""Build passages.jsonl from compact specs, so nobody counts word indexes by hand.

A spec line names the mistakes by word, not index:
    {"id": "hi-101", "lang": "hi-IN", "reference": "...", "skip": ["अपने"], "sub": {"जाती": "आती"}}

    uv run python scripts/build_passages.py data/go_no_go/spec.hi.jsonl [more specs...]
"""

import json
import sys
from pathlib import Path

from akshara.text import words

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "go_no_go" / "passages.jsonl"


def build(spec: dict) -> dict:
    ref = words(spec["reference"])
    skip = {words(w)[0] for w in spec.get("skip", [])}
    sub = {words(k)[0]: words(v)[0] for k, v in spec.get("sub", {}).items()}
    for w in [*skip, *sub]:
        if w not in ref:
            sys.exit(f"{spec['id']}: {w!r} is not in the reference")
        if ref.count(w) > 1:
            sys.exit(f"{spec['id']}: {w!r} appears more than once, pick another word")
    read_as, errors = [], []
    for i, w in enumerate(ref):
        if w in skip:
            errors.append({"index": i, "type": "skip"})
        elif w in sub:
            errors.append({"index": i, "type": "substitution", "said": sub[w]})
            read_as.append(sub[w])
        else:
            read_as.append(w)
    return {
        "id": spec["id"],
        "lang": spec["lang"],
        "reference": spec["reference"],
        "read_as": " ".join(read_as),
        "errors": errors,
    }


def main() -> None:
    specs = [
        json.loads(line)
        for path in sys.argv[1:]
        for line in Path(path).read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    rows = [build(s) for s in specs]
    OUT.write_text(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8"
    )
    print(f"wrote {len(rows)} passages to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
