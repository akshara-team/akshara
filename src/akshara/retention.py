"""Recordings are kept for the teacher's review for a limited time, then deleted.

The database row of a reading stays (its words and scores); only the audio goes. A file in
the recordings folder that no reading points to is deleted once it is older than the limit.
"""

import time
from pathlib import Path

from akshara.store import Store

DAY_S = 86_400.0


def remove_files(folder: Path | None, names: list[str]) -> None:
    """Delete recording files by name. Names come from the database, never from a request,
    and must stay inside the folder."""
    if folder is None:
        return
    for name in names:
        path = folder / name
        if path.parent == folder:
            path.unlink(missing_ok=True)


def purge(store: Store, folder: Path | None, days: float, now: float | None = None) -> int:
    """Delete recordings older than `days`. Returns how many files were removed."""
    if folder is None or days <= 0:
        return 0
    cutoff = (now if now is not None else time.time()) - days * DAY_S
    expired = store.recordings_before(cutoff)
    remove_files(folder, [name for _, name in expired])
    store.forget_audio([rid for rid, _ in expired])
    removed = len(expired)
    if folder.is_dir():
        kept = store.recording_names()
        for path in folder.glob("*.wav"):
            if path.name not in kept and path.stat().st_mtime < cutoff:
                path.unlink(missing_ok=True)
                removed += 1
    return removed
