"""HTTP API. Run with: uv run uvicorn akshara.api.app:create_app --factory"""

import logging
import tempfile
import threading
import time
from collections import defaultdict, deque
from pathlib import Path

from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile

from akshara import passages as passage_bank
from akshara.api.schemas import AttemptOut, LearnerSummary
from akshara.providers.base import ProviderError, SpeechToText
from akshara.providers.fixture import FixtureSTT
from akshara.service import assess, audio_seconds
from akshara.settings import ROOT, Settings
from akshara.store import Store

log = logging.getLogger("akshara")
RATE_LIMIT, RATE_WINDOW_S = 30, 60.0
PASSAGES = ROOT / "data" / "go_no_go" / "passages.jsonl"


def build_stt(settings: Settings) -> SpeechToText:
    if settings.provider == "prisma":
        from akshara.providers.prisma import PrismaSTT

        return PrismaSTT()
    return FixtureSTT.from_cache(ROOT / "results" / "transcripts")


def create_app(
    settings: Settings | None = None,
    stt: SpeechToText | None = None,
    bank: dict[str, dict] | None = None,
) -> FastAPI:
    settings = settings or Settings.from_env()
    stt = stt or build_stt(settings)
    store = Store(settings.db_path)
    bank = bank if bank is not None else passage_bank.load(PASSAGES)
    stt_lock = threading.Lock()  # Prisma allows one active request at a time
    hits: dict[str, deque[float]] = defaultdict(deque)
    app = FastAPI(title="Akshara", version="0.1.0")

    def limit(request: Request) -> None:
        now, q = time.monotonic(), hits[request.client.host if request.client else "?"]
        while q and now - q[0] > RATE_WINDOW_S:
            q.popleft()
        if len(q) >= RATE_LIMIT:
            raise HTTPException(429, "too many requests")
        q.append(now)

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "provider": stt.name, "passages": len(bank)}

    @app.get("/v1/passages/{passage_id}")
    def get_passage(passage_id: str) -> dict:
        p = bank.get(passage_id)
        if not p:
            raise HTTPException(404, "unknown passage")
        return {"id": p["id"], "language": p["lang"], "text": p["reference"]}

    @app.post("/v1/attempts", response_model=AttemptOut)
    def create_attempt(
        request: Request,
        audio: UploadFile = File(...),
        learner: str = Form(..., min_length=1, max_length=40),
        passage_id: str = Form(...),
        x_request_id: str | None = Header(default=None),
    ) -> AttemptOut:
        limit(request)
        passage = bank.get(passage_id)
        if not passage:
            raise HTTPException(404, "unknown passage")
        data = audio.file.read(settings.max_upload_bytes + 1)
        if len(data) > settings.max_upload_bytes:
            raise HTTPException(413, "audio too large")
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / (Path(audio.filename or "clip.wav").stem + ".wav")
            path.write_bytes(data)
            seconds = audio_seconds(path)
            if seconds is None:
                raise HTTPException(415, "audio must be a WAV file")
            if seconds > settings.max_audio_seconds:
                raise HTTPException(413, f"audio longer than {settings.max_audio_seconds:.0f} s")
            try:
                with stt_lock:
                    a = assess(
                        stt=stt, store=store, audio=path, learner=learner, passage_id=passage_id,
                        reference=passage["reference"], language=passage["lang"],
                        request_id=x_request_id,
                    )  # fmt: skip
            except ProviderError as e:
                log.warning("provider failed: %s", e)
                raise HTTPException(502, "speech provider failed") from e
        log.info("attempt %s %s acc=%.2f", a.request_id, passage_id, a.accuracy)
        return AttemptOut(**{**a.__dict__, "words": a.words})

    @app.get("/v1/attempts/{request_id}", response_model=AttemptOut)
    def get_attempt(request_id: str) -> AttemptOut:
        row = store.attempt(request_id)
        if not row:
            raise HTTPException(404, "unknown attempt")
        learner = store.db.execute(
            "SELECT alias FROM learners WHERE id = ?", (row["learner_id"],)
        ).fetchone()["alias"]
        return AttemptOut(
            request_id=request_id, learner=learner, passage_id=row["passage_id"],
            language=row["language"], provider=row["provider"], transcript=row["transcript"],
            accuracy=row["accuracy"], wcpm=row["wcpm"], words=row["trace"],
        )  # fmt: skip

    @app.get("/v1/class/summary", response_model=list[LearnerSummary])
    def class_summary() -> list[dict]:
        return store.class_summary()

    return app
