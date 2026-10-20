"""Expand spec.context.jsonl into three passages per sentence frame.

Each frame has a target word that the sentence context strongly predicts. We read it three ways:
    <id>-ok  correctly (control)
    <id>-m   with a near-identical sound swapped in (minimal pair)
    <id>-d   with a distant, equally wrong word swapped in

If Prisma autocorrects from context, -m should be caught less often than -d.

    uv run python scripts/build_context_passages.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_passages import build  # noqa: E402

DATA = Path(__file__).resolve().parent.parent / "data" / "go_no_go"


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    rows = []
    for line in (DATA / "spec.context.jsonl").read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        f = json.loads(line)
        base = {"lang": f["lang"], "reference": f["reference"]}
        rows.append(build({**base, "id": f"{f['id']}-ok"}))
        rows.append(build({**base, "id": f"{f['id']}-m", "sub": {f["target"]: f["minimal"]}}))
        rows.append(build({**base, "id": f"{f['id']}-d", "sub": {f["target"]: f["distant"]}}))
    out = DATA / "passages.context.jsonl"
    lines = (json.dumps(r, ensure_ascii=False) + "\n" for r in rows)
    out.write_text("".join(lines), encoding="utf-8")
    print(f"wrote {len(rows)} passages to {out.name}")


if __name__ == "__main__":
    main()
