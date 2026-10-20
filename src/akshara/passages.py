"""Passage bank loaded from a JSONL file with `id`, `lang` and `reference`."""

import json
from pathlib import Path


def load(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    rows = (json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line)
    return {r["id"]: r for r in rows}
