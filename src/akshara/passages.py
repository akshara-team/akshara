"""Passage bank loaded from a JSONL file with `id`, `lang` and `reference`, plus the
optional catalogue (`title`, `level`, `publisher`, `url`, `licence`) from a sources file."""

import json
from pathlib import Path

CATALOGUE = ("title", "level", "publisher", "url", "licence")


def _rows(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]


def load(path: Path, sources: Path | None = None) -> dict[str, dict]:
    bank = {r["id"]: r for r in _rows(path)}
    for s in _rows(sources) if sources else []:
        if s["id"] in bank:
            bank[s["id"]].update({k: s[k] for k in CATALOGUE if s.get(k)})
    return bank
