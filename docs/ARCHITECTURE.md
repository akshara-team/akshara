# Architecture

## Layout

```
src/akshara/
  core/        pure: text.py (normalise, spelling-variant keys), align.py (score a reading),
               script.py (letter and sound tables), aksharas.py, parts.py, pauses.py,
               wordspans.py (where a word probably is), difficulty.py, confusions.py
  providers/   base.py (interfaces), prisma.py, timbre.py, fixture.py (offline replay),
               cache.py and audio_cache.py (by content), ledger.py (credit cap)
  learner/     skills.py (skill graph per script), bkt.py (mastery), placement.py (ASER tree),
               tutor.py (the learner model inside the app), simulate.py (simulated children)
  evidence/    per-word audio check with an acoustic model (MMS, CTC); studied, not in the app
  fusion.py    combine evidence into correct / unsure / error; studied, not in the app
  service.py   assess(): transcribe -> score -> persist, idempotent on request id
  review.py    which marks a teacher should hear
  retention.py delete recordings past the retention limit
  reliability.py  numbers for the app's "How reliable is this?" page, from results/
  store.py     SQLite with ordered migrations (children, attempts, placements, skills, reviews)
  api/         FastAPI app and response schemas
  settings.py  typed settings from the environment
web/           Vite + React + TypeScript PWA: child screens, teacher screens, mock and live modes
scripts/       study tooling and build_reliability.py; no script runs in CI with credits
tests/         unit, API, store, end-to-end and eval-gate tests; no live calls
```

## One reading, end to end

```
child taps the mic -> browser records, checks for silence, makes a 16 kHz WAV,
                      fixes a request id for this clip
   -> POST /v1/attempts (WAV, child_id, session, passage_id, part_index, X-Request-ID)
      -> size, type, length checks, rate limit
      -> under one lock: is this a resend? then Prisma (verbatim, no bias_list) or fixture
      -> core scorer: a mark per word, accuracy, WCPM
      -> SQLite attempt with the trace of what was heard
      -> recording kept for review (only with a parent's consent, deleted after 30 days)
      -> learner model updated (not on a resend)
   <- words and marks -> feedback screen; missed words -> practice (Timbre per akshara)
no connection -> the browser keeps the clip (IndexedDB) and sends it later with the same id
```

## The teacher's side

```
/v1/children (consent date required)  -> class view, profile, edit, DELETE (everything, at once)
/v1/children/{id}/placements          -> ASER placement, by recording or by ear
/v1/children/{id}/next                -> the learner model's next story
/v1/review                            -> marks worth hearing; a teacher's mark replaces the scorer's
/v1/attempts/{id}/words/{i}/clip      -> the stretch of audio where the word probably is
/teacher/reliability (web)            -> catch rates from results/, with the study's limits
```

## Rules

1. **The scorer is pure.** No network or LLM calls in `core/`, so scores repeat exactly.
2. **Providers sit behind interfaces.** The service never imports Prisma directly, so the
   fixture provider, a second model or a mitigation pass can be swapped in.
3. **Never send `bias_list` to Prisma** for reading attempts; it hides mistakes. Use
   `format=verbatim`.
4. **Cache and cap everything that costs credits.** Transcripts and Timbre audio are cached by
   content; every paid call goes in `results/ledger.jsonl` (per checkout, not in git) with a
   hard cap. The study's calls are kept as a record in `results/ledger_study.jsonl`.
5. **Retries are safe.** An attempt is keyed by request id; a resend returns the stored result,
   makes no second paid call and does not teach the learner model twice.
6. **Numbers come from results.** The reliability page and the write-ups are checked against
   the committed result files by tests (`test_reliability.py`, `check_numbers.py`).
7. **Children's data:** nicknames only, a parent's consent before anything is kept, recordings
   deleted after `AKSHARA_RETENTION_DAYS` (30), and one call to delete a child completely.
8. **Tests never call the API.** An eval gate fails if the committed results drop below the
   pass line.

## Not built or not verified

- No logins or multiple teachers; one server serves one class.
- The evidence model and fusion are not in the app (measured, did not beat Prisma alone).
- Evon's practice-sentence pipeline is built and tested, but its first batch has not run.
- The Dockerfile has not been built on this machine.
