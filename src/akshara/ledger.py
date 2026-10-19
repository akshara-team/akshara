"""Append-only log of every paid Gnani call, with a hard cap so a loop can't drain credits."""

import json
import os
import time
from pathlib import Path

LEDGER = Path(__file__).resolve().parents[2] / "results" / "ledger.jsonl"
DEFAULT_CAP = 600


class CapExceeded(RuntimeError):
    pass


def calls_so_far() -> int:
    return sum(1 for _ in LEDGER.open(encoding="utf-8")) if LEDGER.exists() else 0


def record(kind: str, **fields) -> None:
    """Log one call. Raises before the call is counted if the cap is already reached."""
    cap = int(os.environ.get("AKSHARA_MAX_CALLS", DEFAULT_CAP))
    if calls_so_far() >= cap:
        raise CapExceeded(f"{cap} paid calls already made; raise AKSHARA_MAX_CALLS to go on")
    LEDGER.parent.mkdir(exist_ok=True)
    with LEDGER.open("a", encoding="utf-8") as f:
        f.write(json.dumps({"t": time.time(), "kind": kind, **fields}) + "\n")
