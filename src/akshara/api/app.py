"""HTTP API. Run with: uv run uvicorn akshara.api.app:create_app --factory"""

import logging
import tempfile
import threading
import time
from collections import defaultdict, deque
from pathlib import Path

from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, Response

from akshara import passages as passage_bank
from akshara.api.schemas import (
    AttemptOut,
    ChildIn,
    ChildOut,
    ChildPatch,
    LearnerSummary,
    NextOut,
    PlacementAnswer,
    PlacementOut,
    PlacementRead,
    ReadingOut,
    SkillsOut,
)
from akshara.core.align import score
from akshara.core.parts import split_parts
from akshara.learner import tutor
from akshara.providers.audio_cache import CachedTTS
from akshara.providers.base import ProviderError, SpeechToText, TextToSpeech
from akshara.providers.fixture import FixtureSTT
from akshara.providers.ledger import CapExceeded
from akshara.service import assess, audio_seconds, transcribe_reading
from akshara.settings import ROOT, Settings
from akshara.store import DuplicateAlias, Store

log = logging.getLogger("akshara")
RATE_LIMIT, RATE_WINDOW_S = 30, 60.0
PASSAGES = ROOT / "data" / "open_passages" / "passages.jsonl"
SOURCES = ROOT / "data" / "open_passages" / "sources.jsonl"
INDEX = Path(__file__).parent / "static" / "index.html"
AUDIO_CACHE = ROOT / "results" / "audio"
SUPPORTED_LANGUAGES = frozenset({"hi-IN", "kn-IN", "ta-IN"})
MAX_WORD_CHARS = 60


def scored(trace: list[dict]) -> list[dict]:
    """The trace entries that are reference words (insertions dropped), as `tutor.states`."""
    return [w for w in trace if w["op"] != "inserted"]


def build_stt(settings: Settings) -> SpeechToText:
    if settings.provider == "prisma":
        from akshara.providers.prisma import PrismaSTT

        return PrismaSTT()
    return FixtureSTT.from_cache(ROOT / "results" / "transcripts")


def build_tts(tts: TextToSpeech | None) -> TextToSpeech:
    if tts is not None:
        return tts
    from akshara.providers.timbre import TimbreTTS

    return CachedTTS(TimbreTTS(), AUDIO_CACHE)


def create_app(
    settings: Settings | None = None,
    stt: SpeechToText | None = None,
    bank: dict[str, dict] | None = None,
    tts: TextToSpeech | None = None,
) -> FastAPI:
    settings = settings or Settings.from_env()
    stt = stt or build_stt(settings)
    tts = build_tts(tts)
    store = Store(settings.db_path)
    bank = bank if bank is not None else passage_bank.load(PASSAGES, SOURCES)
    stt_lock = threading.Lock()  # Prisma allows one active request at a time
    libraries: dict[str, tutor.Library | None] = {}

    def library(lang: str) -> tutor.Library:
        if lang not in libraries:
            libraries[lang] = tutor.library(bank, lang)
        lib = libraries[lang]
        if lib is None:
            raise HTTPException(409, f"no passages for {lang}")
        return lib

    def learn(child_id: int, lang: str, results: list[tuple[str, str]]) -> None:
        """Feed word results to the child's learner model and save it."""
        if not results:
            return
        lib = library(lang)
        learner = tutor.learner_from(store.skills(child_id))
        tutor.observe_words(learner, lib.curriculum, results)
        store.save_skills(child_id, learner.mastery, learner.seen)

    def passage_out(p: dict) -> dict:
        return {
            "id": p["id"], "language": p["lang"], "text": p["reference"],
            "parts": split_parts(p["reference"]),
            "title": p.get("title"), "level": p.get("level"),
            # StoryWeaver texts are CC BY: the credit travels with the passage
            "credit": {k: p[k] for k in ("publisher", "url", "licence") if p.get(k)} or None,
        }  # fmt: skip

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

    @app.get("/")
    def index() -> FileResponse:
        return FileResponse(INDEX)

    @app.get("/v1/passages")
    def list_passages(lang: str | None = None) -> list[dict]:
        return [passage_out(p) for p in bank.values() if lang in (None, p["lang"])]

    @app.get("/v1/passages/{passage_id}")
    def get_passage(passage_id: str) -> dict:
        p = bank.get(passage_id)
        if not p:
            raise HTTPException(404, "unknown passage")
        return passage_out(p)

    @app.get("/v1/feedback/audio")
    def feedback_audio(lang: str, word: str) -> Response:
        """Timbre pronunciation of one word, cached by content. Costs one call on a miss."""
        if lang not in SUPPORTED_LANGUAGES:
            raise HTTPException(400, f"unsupported language {lang!r}")
        text = word.strip()
        if not 1 <= len(text) <= MAX_WORD_CHARS:
            raise HTTPException(400, f"word must be 1-{MAX_WORD_CHARS} characters")
        try:
            audio = tts.synthesize(text, lang, None)
        except CapExceeded as e:
            log.error("paid-call cap reached: %s", e)
            raise HTTPException(503, "paid-call cap reached") from e
        except ProviderError as e:
            log.warning("tts failed: %s", e)
            raise HTTPException(502, "speech provider failed") from e
        return Response(audio, media_type="audio/wav")

    @app.post("/v1/attempts", response_model=AttemptOut)
    def create_attempt(
        request: Request,
        audio: UploadFile = File(...),
        passage_id: str = Form(...),
        learner: str | None = Form(default=None, min_length=1, max_length=40),
        child_id: int | None = Form(default=None),
        session: str | None = Form(default=None, min_length=1, max_length=64),
        part_index: int | None = Form(default=None),
        x_request_id: str | None = Header(default=None),
    ) -> AttemptOut:
        limit(request)
        passage = bank.get(passage_id)
        if not passage:
            raise HTTPException(404, "unknown passage")
        if child_id is not None:  # a child the teacher added
            child = store.child(child_id)
            if not child:
                raise HTTPException(404, "unknown child")
            learner = child["alias"]
        elif not learner:
            raise HTTPException(422, "learner or child_id is required")
        reference = passage["reference"]
        if part_index is not None:  # score against just the part that was read
            parts = split_parts(reference)
            if not 0 <= part_index < len(parts):
                raise HTTPException(400, f"part_index must be 0-{len(parts) - 1}")
            reference = parts[part_index]
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
            # a resent upload returns the stored result and must not teach the model twice
            retry = bool(x_request_id) and store.attempt(x_request_id) is not None
            try:
                with stt_lock:
                    a = assess(
                        stt=stt, store=store, audio=path, learner=learner, passage_id=passage_id,
                        reference=reference, language=passage["lang"],
                        request_id=x_request_id, part_index=part_index, learner_id=child_id,
                        session_id=session,
                    )  # fmt: skip
            except CapExceeded as e:
                log.error("paid-call cap reached: %s", e)
                raise HTTPException(503, "paid-call cap reached") from e
            except ProviderError as e:
                log.warning("provider failed: %s", e)
                raise HTTPException(502, "speech provider failed") from e
        if child_id is not None and not retry:
            learn(
                child_id,
                passage["lang"],
                [
                    (w["word"], s)
                    for w, s in zip(scored(a.words), tutor.states(a.words), strict=True)
                ],
            )
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
            part_index=row["part_index"],
        )  # fmt: skip

    def child_out(c: dict) -> dict:
        rs = store.readings(c["id"])
        brief = lambda r: {"at": r["at"], "accuracy": r["accuracy"], "wcpm": r["wcpm"]}  # noqa: E731
        level = store.latest_level(c["id"])
        return {
            **{k: c[k] for k in ("id", "alias", "language", "grade", "avatar", "created_at")},
            "readings": len(rs),
            "latest": brief(rs[0]) if rs else None,
            "previous": brief(rs[1]) if len(rs) > 1 else None,
            "level": level["level"] if level else None,
            "level_uncertain": bool(level["uncertain"]) if level else False,
        }

    def child_or_404(child_id: int) -> dict:
        c = store.child(child_id)
        if not c:
            raise HTTPException(404, "unknown child")
        return c

    @app.get("/v1/children", response_model=list[ChildOut])
    def list_children(lang: str | None = None) -> list[dict]:
        return [child_out(c) for c in store.children(lang)]

    @app.post("/v1/children", response_model=ChildOut, status_code=201)
    def add_child(body: ChildIn) -> dict:
        try:
            child_id = store.create_child(body.alias, body.language, body.grade, body.avatar)
        except DuplicateAlias as e:
            raise HTTPException(409, "a child with this name already exists") from e
        return child_out(child_or_404(child_id))

    @app.get("/v1/children/{child_id}", response_model=ChildOut)
    def get_child(child_id: int) -> dict:
        return child_out(child_or_404(child_id))

    @app.patch("/v1/children/{child_id}", response_model=ChildOut)
    def edit_child(child_id: int, body: ChildPatch) -> dict:
        child_or_404(child_id)
        try:
            store.update_child(child_id, **body.model_dump(exclude_unset=True))
        except DuplicateAlias as e:
            raise HTTPException(409, "a child with this name already exists") from e
        return child_out(child_or_404(child_id))

    @app.get("/v1/children/{child_id}/readings", response_model=list[ReadingOut])
    def child_readings(child_id: int) -> list[dict]:
        child_or_404(child_id)
        return [
            {**r, "title": bank.get(r["passage_id"], {}).get("title")}
            for r in store.readings(child_id)
        ]

    # ---- placement: ASER-style, teacher-run, one item at a time

    def placement_or_404(placement_id: int) -> dict:
        pl = store.placement(placement_id)
        if not pl:
            raise HTTPException(404, "unknown placement")
        return pl

    def placement_out(pl: dict) -> dict:
        child = child_or_404(pl["child_id"])
        items = pl["items"]
        state = tutor.replay([i["states"] for i in items])
        outcomes = [entry[2] for entry in state.log]
        item = None
        if not state.done:
            item = tutor.placement_item(
                library(child["language"]), state.task or "paragraph", pl["seed"] * 100 + len(items)
            )
        return {
            "id": pl["id"],
            "child_id": pl["child_id"],
            "level": state.level,
            "uncertain": state.uncertain,
            "item": item,
            "done": [{**i, "outcome": outcomes[k] if k < len(outcomes) else None}
                     for k, i in enumerate(items)],
        }  # fmt: skip

    @app.post("/v1/children/{child_id}/placements", response_model=PlacementOut, status_code=201)
    def start_placement(child_id: int) -> dict:
        child = child_or_404(child_id)
        library(child["language"])
        seed = int(time.time() * 1000) % 1_000_000
        return placement_out(placement_or_404(store.create_placement(child_id, seed)))

    @app.get("/v1/placements/{placement_id}", response_model=PlacementOut)
    def get_placement(placement_id: int) -> dict:
        return placement_out(placement_or_404(placement_id))

    @app.post("/v1/placements/{placement_id}/read", response_model=PlacementRead)
    def read_placement_item(
        placement_id: int, request: Request, audio: UploadFile = File(...)
    ) -> dict:
        """Score a recording of the current item. Costs a Prisma call; records nothing."""
        limit(request)
        out = placement_out(placement_or_404(placement_id))
        item = out["item"]
        if item is None:
            raise HTTPException(409, "placement is finished")
        lang = child_or_404(out["child_id"])["language"]
        data = audio.file.read(settings.max_upload_bytes + 1)
        if len(data) > settings.max_upload_bytes:
            raise HTTPException(413, "audio too large")
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "placement.wav"
            path.write_bytes(data)
            seconds = audio_seconds(path)
            if seconds is None:
                raise HTTPException(415, "audio must be a WAV file")
            if seconds > settings.max_audio_seconds:
                raise HTTPException(413, f"audio longer than {settings.max_audio_seconds:.0f} s")
            try:
                with stt_lock:
                    transcript = transcribe_reading(stt, path, lang)
            except CapExceeded as e:
                raise HTTPException(503, "paid-call cap reached") from e
            except ProviderError as e:
                log.warning("provider failed: %s", e)
                raise HTTPException(502, "speech provider failed") from e
        s = score(" ".join(item["words"]), transcript, seconds, loose=lang != "kn-IN")
        trace = [
            {"op": m.op, "word": m.ref_word, "said": m.said, "index": m.ref_index,
             "check": m.op == "correct" and m.said != m.ref_word}
            for m in s.marks
        ]  # fmt: skip
        return {"transcript": transcript, "words": trace, "states": tutor.states(trace)}

    @app.post("/v1/placements/{placement_id}/answer", response_model=PlacementOut)
    def answer_placement_item(placement_id: int, body: PlacementAnswer) -> dict:
        """Record the confirmed marks of the current item and move on."""
        pl = placement_or_404(placement_id)
        out = placement_out(pl)
        item = out["item"]
        if item is None:
            raise HTTPException(409, "placement is finished")
        if len(body.states) != len(item["words"]):
            raise HTTPException(422, f"expected {len(item['words'])} states")
        items = [*pl["items"], {**item, "states": list(body.states)}]
        state = tutor.replay([i["states"] for i in items])
        store.save_placement(placement_id, items, state.level, state.uncertain)
        lang = child_or_404(pl["child_id"])["language"]
        learn(pl["child_id"], lang, list(zip(item["words"], body.states, strict=True)))
        return placement_out(placement_or_404(placement_id))

    # ---- learner model

    @app.get("/v1/children/{child_id}/skills", response_model=SkillsOut)
    def child_skills(child_id: int) -> dict:
        child = child_or_404(child_id)
        lib = library(child["language"])
        learner = tutor.learner_from(store.skills(child_id))
        return tutor.skill_summary(learner, lib.curriculum)

    @app.get("/v1/children/{child_id}/next", response_model=NextOut)
    def next_passage(child_id: int) -> dict:
        child = child_or_404(child_id)
        lib = library(child["language"])
        rs = store.readings(child_id)
        level = store.latest_level(child_id)
        pick = tutor.next_passage(
            lib,
            tutor.learner_from(store.skills(child_id)),
            level["level"] if level else None,
            [r["passage_id"] for r in rs],
            [r["accuracy"] for r in rs],
        )
        return {
            "passage_id": pick["passage_id"],
            "reason": pick["reason"],
            "level": level["level"] if level else None,
        }

    @app.get("/v1/class/summary", response_model=list[LearnerSummary])
    def class_summary() -> list[dict]:
        return store.class_summary()

    return app
