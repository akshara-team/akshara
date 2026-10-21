# API Contract

*Owner: Daniel. This documents the live API served by `src/akshara/api/app.py`, so the
frontend (and anything else) can build against it. An earlier draft proposed a different
shape (`/api/stories` with chunks, per-child progress, feedback audio); it was superseded —
see "Not built (deferred)" at the bottom, which is kept as the wish-list.*

## Conventions

- Base path `/v1`. JSON everywhere except the audio upload.
- **Errors** use FastAPI's default body, `{"detail": "..."}`, with these codes:
  `404` unknown passage/attempt · `413` audio too large or too long · `415` not a WAV ·
  `429` rate limit · `502` speech provider failed.
- **Audio in**: `multipart/form-data`, one clip per attempt, **WAV**, ≤ 2,000,000 bytes and
  ≤ 30 s. The browser sends 16 kHz mono WAV.
- **Language codes**: `hi-IN`, `kn-IN`, `ta-IN`.
- **No auth.** Learners are aliases; no real names or IDs (data rules).
- **Rate limit**: 30 requests / 60 s per client IP.
- **Provider**: offline fixture by default (replays cached transcripts); Prisma when
  `AKSHARA_PROVIDER=prisma`. The client does not choose this.
- The demo screen is served at `/`. A frontend on a **separate origin needs CORS** added to
  the app.

## Endpoints

### `GET /health`

```json
{"status": "ok", "provider": "fixture", "passages": 36}
```

### `GET /v1/passages?lang=kn-IN`

Passages for one language (omit `lang` for all). `text` is the reference the child reads.

```json
[
  {"id": "kn-101", "language": "kn-IN", "text": "ರಾಮು ಪ್ರತಿದಿನ ಶಾಲೆಗೆ ಹೋಗುತ್ತಾನೆ. ..."}
]
```

### `GET /v1/passages/{passage_id}`

```json
{"id": "kn-101", "language": "kn-IN", "text": "ರಾಮು ಪ್ರತಿದಿನ ಶಾಲೆಗೆ ಹೋಗುತ್ತಾನೆ. ..."}
```

### `GET /v1/feedback/audio?lang=kn-IN&word=ಹಾರುತ್ತಿತ್ತು`

Timbre pronunciation of one word, for the "Listen" buttons. Returns `audio/wav`
(mono 16 kHz). `lang` must be `hi-IN`, `kn-IN` or `ta-IN`; `word` is trimmed and must be
1–60 characters (both violations → `400`). Results are cached on disk by
`sha256(text, language, voice)`, so repeating a word never costs another credit. A provider
failure is `502`. Costs one Timbre call on a cache miss.

### `POST /v1/attempts` (multipart)

Fields: `audio` (WAV file), `learner` (alias, 1–40 chars), `passage_id`.
Optional header `X-Request-ID` makes the call idempotent (resending returns the stored
result and makes no second paid call). Runs Prisma (verbatim, **no `bias_list`**) then the
pure scorer.

```json
{
  "notice": "Skipped and clearly different words are caught reliably. ...",
  "request_id": "a_7f1c",
  "learner": "learner-1",
  "passage_id": "kn-101",
  "language": "kn-IN",
  "provider": "prisma-v2.5",
  "transcript": "ರಾಮು ಪ್ರತಿದಿನ ಮನೆಗೆ ಹೋಗುತ್ತಾನೆ ...",
  "accuracy": 0.86,
  "wcpm": 42.5,
  "words": [
    {"op": "correct", "word": "ರಾಮು", "said": "ರಾಮು", "index": 0, "check": false},
    {"op": "skipped", "word": "ಬೆಳಿಗ್ಗೆ", "said": null, "index": 1, "check": false},
    {"op": "correct", "word": "ಸುಂದರ", "said": "ಸುಂದರ", "index": 2, "check": true}
  ]
}
```

- `words[].op` ∈ `correct | substituted | skipped | inserted`; `index` is `null` for
  inserted words.
- `check: true` means the word counted correct **only via a spelling-variant rule** — the UI
  shows it as the dashed "?" state. `notice` carries the honesty statement and must be shown
  with every result.
- `wcpm` is `null` when the duration is unknown.

### `GET /v1/attempts/{request_id}`

Same shape as above, from the store.

### `GET /v1/class/summary`

One row per learner (class-level, not per child).

```json
[
  {"alias": "learner-1", "language": "kn-IN", "attempts": 8, "accuracy": 0.91, "wcpm": 38.2}
]
```

## Not built (deferred)

Things the earlier draft wanted, not implemented and not needed for the demo:

- `stories` with an explicit `chunks` split — passages are read whole and each is already
  under 30 s.
- Per-child progress (`/children/{id}/progress`) and an attempt-history list — the class
  summary covers the demo.
- Timbre **feedback audio** for a missed word — would turn the screener into a tutor.
- Evon story generation.

## Still open

1. Keep `POST /v1/attempts` inline (one STT call, synchronous), or queue it? Inline is fine
   at demo scale.
2. Keep raw attempt audio on disk for admin review, or discard after scoring?
