"""The teacher's review queue: which marks a teacher should hear before trusting them.

A word goes in the queue when:
- the scorer accepted it only through a spelling-variant rule (`check`): it may hide a misread;
- it is red in an otherwise strong reading (accuracy at least `STRONG`): a good reader's single
  "mistake" is as likely the transcriber mishearing as the child misreading.

A teacher's mark replaces the scorer's: `correct`, `misread` or `skipped`. Readings, the class
view and the learner model use it from then on (`apply`).

Pure and deterministic.
"""

STRONG = 0.8
RESULT_OP = {"correct": "correct", "misread": "substituted", "skipped": "skipped"}


def reasons(trace: list[dict], accuracy: float) -> dict[int, str]:
    """Reference-word index → why it needs a listen."""
    out = {}
    for w in trace:
        i = w.get("index")
        if i is None:
            continue
        if w["op"] == "correct" and w.get("check"):
            out[i] = "accepted as a spelling variant"
        elif w["op"] in ("substituted", "skipped") and accuracy >= STRONG:
            out[i] = (
                "the only slip in a strong reading"
                if _slips(trace) == 1
                else ("a slip in a strong reading")
            )
    return out


def _slips(trace: list[dict]) -> int:
    return sum(1 for w in trace if w["op"] in ("substituted", "skipped"))


def apply(trace: list[dict], marks: dict[int, str]) -> list[dict]:
    """The trace with a teacher's marks in place of the scorer's."""
    out = []
    for w in trace:
        mark = marks.get(w.get("index")) if w.get("index") is not None else None
        if mark is None:
            out.append(w)
            continue
        op = RESULT_OP[mark]
        said = w["word"] if op == "correct" else (None if op == "skipped" else w.get("said"))
        out.append({**w, "op": op, "said": said, "check": False, "teacher": mark})
    return out


def state_of(mark: str) -> str:
    """A teacher's mark as learner-model evidence."""
    return "correct" if mark == "correct" else "error"
