"""Chunked re-check: transcribe each stretch of speech on its own.

A transcriber that sees the whole sentence can quietly correct a misread word into the one the
sentence predicts. A short piece gives it little context to correct from. The pieces are found
from pauses in the audio, since Prisma returns no word timings.
"""

import tempfile
from pathlib import Path

from akshara.core.pauses import cut, segments
from akshara.core.wavio import read_wav, write_wav
from akshara.providers.base import SpeechToText


def chunked_transcript(
    stt: SpeechToText, audio: Path, language: str, *, min_pause_s: float = 0.25
) -> tuple[str, int]:
    """Return (joined transcript, number of pieces). One piece means no pause was found, and the
    whole clip is transcribed instead."""
    samples, rate = read_wav(audio)
    parts = cut(samples, rate, segments(samples, rate, min_pause_s=min_pause_s))
    if len(parts) <= 1:
        return stt.transcribe(audio, language), 1
    texts = []
    with tempfile.TemporaryDirectory() as tmp:
        for k, part in enumerate(parts):
            piece = Path(tmp) / f"{audio.stem}-c{k}.wav"
            write_wav(piece, part, rate)
            texts.append(stt.transcribe(piece, language))
    return " ".join(t for t in texts if t), len(parts)
