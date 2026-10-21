"""One reading attempt: transcribe, score, persist. Providers and storage are injected."""

import time
import uuid
import wave
from dataclasses import dataclass
from pathlib import Path

from akshara.core.align import score
from akshara.providers.base import SpeechToText
from akshara.store import Store


@dataclass
class Attempt:
    request_id: str
    learner: str
    passage_id: str
    language: str
    provider: str
    transcript: str
    accuracy: float
    wcpm: float | None
    words: list[dict]  # one entry per passage word: op, word, said
    part_index: int | None = None  # None: the whole passage was read


def audio_seconds(path: Path) -> float | None:
    try:
        with wave.open(str(path)) as w:
            return w.getnframes() / w.getframerate()
    except (wave.Error, EOFError):
        return None


def assess(
    *,
    stt: SpeechToText,
    store: Store,
    audio: Path,
    learner: str,
    passage_id: str,
    reference: str,
    language: str,
    request_id: str | None = None,
    part_index: int | None = None,
) -> Attempt:
    """Score one reading of `reference`, which is the whole passage or the part being read."""
    request_id = request_id or uuid.uuid4().hex
    done = store.attempt(request_id)
    if done:  # a retried request returns the stored result, with no second paid call
        return Attempt(
            request_id, learner, passage_id, language, done["provider"], done["transcript"],
            done["accuracy"], done["wcpm"], done["trace"], done["part_index"],
        )  # fmt: skip
    t0 = time.perf_counter()
    transcript = stt.transcribe(audio, language)
    latency_ms = int((time.perf_counter() - t0) * 1000)
    duration = audio_seconds(audio)
    s = score(reference, transcript, duration, loose=language != "kn-IN")
    trace = [
        {
            "op": m.op, "word": m.ref_word, "said": m.said, "index": m.ref_index,
            # accepted only through a spelling-variant rule: worth a second look
            "check": m.op == "correct" and m.said != m.ref_word,
        }
        for m in s.marks
    ]  # fmt: skip
    store.save_attempt(
        request_id=request_id,
        learner_id=store.learner(learner, language),
        passage_id=passage_id,
        language=language,
        provider=stt.name,
        transcript=transcript,
        duration_s=duration,
        accuracy=s.accuracy,
        wcpm=s.wcpm,
        trace=trace,
        latency_ms=latency_ms,
        part_index=part_index,
    )
    return Attempt(
        request_id, learner, passage_id, language, stt.name, transcript, s.accuracy, s.wcpm,
        trace, part_index,
    )  # fmt: skip
