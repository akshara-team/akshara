# Architecture

## Layout

```
src/akshara/
  core/        pure scoring: text.py (normalise, spelling-variant keys), align.py (edit distance)
  providers/   base.py (SpeechToText, TextToSpeech interfaces), prisma.py, timbre.py,
               fixture.py (offline, replays recorded transcripts), ledger.py (credit cap)
  service.py   assess(): transcribe -> score -> persist, idempotent on request id
  store.py     SQLite with ordered migrations; attempts keep the full trace
  api/         FastAPI app and response schemas
  settings.py  typed settings from the environment
scripts/       study tooling (build passages, make audio and variants, run, analyse)
tests/         unit, API, store and eval-gate tests; no live calls
```

## One reading attempt

```
browser mic -> POST /v1/attempts (WAV, learner, passage_id, X-Request-ID)
   -> size, type and duration checks, rate limit
   -> SpeechToText (Prisma, or fixture offline), one active request at a time
   -> core scorer: green / red per word, accuracy, WCPM
   -> SQLite attempt with the trace of what was heard
   -> GET /v1/attempts/{id}, GET /v1/class/summary
```

## Rules

1. **The scorer is pure.** No network or LLM calls in `core/`, so scores repeat exactly.
2. **Providers sit behind interfaces.** The service never imports Prisma directly, so a recorded-fixture provider, a second model or a mitigation pass can be swapped in.
3. **Never send `bias_list` to Prisma** for reading attempts; it hides mistakes. Use `format=verbatim`.
4. **Cache and cap everything that costs credits.** Transcripts are cached by audio hash; every paid call goes in `results/ledger.jsonl` with a hard cap.
5. **Retries are safe.** An attempt is keyed by request id; resending returns the stored result and makes no second paid call.
6. **Tests never call the API.** An eval gate fails if the committed study results drop below the pass line.

## Planned

- Chunked re-check pass and a "check this word" state in the service (see [PLAN.md](PLAN.md)).
- Browser reading screen and a class summary view.
- Passages from openly licensed books.

## Not built or not verified

- The Dockerfile has not been built on this machine.
- Evon is off the critical path and not used.
