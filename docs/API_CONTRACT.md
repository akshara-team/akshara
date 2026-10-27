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
`parts` is the same text split for reading one part at a time (`core/parts.py`): whole
sentences packed up to 12 words, a sentence cut only past 20 words, and a part under 4 words
joined to its neighbour. Joining `parts` with spaces gives back the words of `text`.

```json
[
  {"id": "kn-101", "language": "kn-IN", "text": "ರಾಮು ಪ್ರತಿದಿನ ಶಾಲೆಗೆ ಹೋಗುತ್ತಾನೆ. ...",
   "parts": ["ರಾಮು ಪ್ರತಿದಿನ ಶಾಲೆಗೆ ಹೋಗುತ್ತಾನೆ. ...", "..."]}
]
```

Each passage also carries its catalogue entry when there is one: `title`, `level` (ASER-style
level of the source book) and `credit` (`publisher`, `url`, `licence`). StoryWeaver texts are
CC BY, so the app shows the credit with the story.

### `GET /v1/passages/{passage_id}`

Same shape as one item above, `parts` included.

### `GET /v1/feedback/audio?lang=kn-IN&word=ಹಾರುತ್ತಿತ್ತು`

Timbre pronunciation of one word, for the "Listen" buttons. Returns `audio/wav`
(mono 16 kHz). `lang` must be `hi-IN`, `kn-IN` or `ta-IN`; `word` is trimmed and must be
1–60 characters (both violations → `400`). Results are cached on disk by
`sha256(text, language, voice)`, so repeating a word never costs another credit. A provider
failure is `502`. Costs one Timbre call on a cache miss.

### `POST /v1/attempts` (multipart)

Fields: `audio` (WAV file, at most 90 s), `passage_id`, and either `child_id` (a child added
with `/v1/children`; unknown → `404`) or `learner` (a bare alias, 1–40 chars, created on first
use; neither → `422`). Optional: `part_index` (0-based index into the passage's `parts`) and
`session` (1–64 chars, the same for every part of one run of a story, so the parts become one
reading). Readings over 25 s are sent to Prisma in windows cut in pauses, since Prisma rejects
clips over about 30 s. With `part_index` the reading is
scored against that part only, so the rest of the passage is not counted as skipped; an index
out of range is `400`. Without it the whole passage is the reference.
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
  "part_index": 0,
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

### `GET /v1/children?lang=kn-IN` · `POST /v1/children` · `GET|PATCH /v1/children/{id}`

The children a teacher manages. `alias` is a nickname, never the full name (1–40 characters,
spaces collapsed, unique: a clash is `409`). `language` is `hi-IN | kn-IN | ta-IN`, `grade`
1–8 or null, `avatar` up to 4 characters. `POST` returns `201`; `PATCH` changes only the fields
sent. Unknown id → `404`.

```json
{"id": 1, "alias": "Meena K", "language": "kn-IN", "grade": 2, "avatar": "MK",
 "created_at": 1793081453.4, "readings": 2,
 "latest": {"at": 1793081500.0, "accuracy": 0.83, "wcpm": 76.0},
 "previous": {"at": 1792990000.0, "accuracy": 0.75, "wcpm": 61.2}}
```

### `GET /v1/children/{id}/readings`

The child's readings, newest first. A reading groups the attempts of one `session` (an
attempt with no session stands alone); if a part was read twice, its last try counts.
`accuracy = correct / total` over the story's words (insertions not counted),
`wcpm = correct / seconds × 60` with `seconds` the summed clip lengths (`null` if any is
unknown). `words` and `transcript` join the parts in order.

```json
[{"session": "4c1d…", "passage_id": "sw-36", "title": "ಈಗಲ್ಲ, ಈಗಲ್ಲ!", "language": "kn-IN",
  "at": 1793081500.0, "parts": [0], "correct": 10, "total": 12, "accuracy": 0.83,
  "wcpm": 76.0, "seconds": 7.9, "transcript": "…", "words": [{"op": "correct", "…": "…"}]}]
```

### Placement: `POST /v1/children/{id}/placements` · `GET /v1/placements/{id}` · `POST /v1/placements/{id}/read` · `POST /v1/placements/{id}/answer`

ASER-style, teacher-run (`learner/placement.py`, items from `learner/tutor.py`). Start on a
paragraph; passed → story, failed → words → letters. `item` is what to show next
(`task`, `text`, `words`, `passage_id`), null once `level` is known
(`beginner | letter | word | paragraph | story`). `read` (multipart `audio`) scores a recording
of the current item and returns `transcript`, `words` and `states`, recording nothing; it costs
a Prisma call. `answer` (`{"states": ["correct" | "error" | "unsure", …]}`, one per word of the
item, `422` otherwise) records the item, which the teacher may have marked by ear or corrected,
updates the learner model, and returns the placement. `409` once finished. When `unsure` marks
decide the call, one more item of the same task follows; if still open, `uncertain: true`.
`GET /v1/children/{id}` then carries `level` and `level_uncertain`.

### `GET /v1/children/{id}/skills`

The learner model (`learner/bkt.py`), updated by every reading with `child_id` (a resent upload
counts once) and every placement answer. `working_on`: up to 3 weakest skills seen at least
twice, below 0.6. `learned`: mastery 0.95 or more, seen at least 4 times. Each skill is
`{id, kind, text, p}`, e.g. `{"id": "letter:ಳ", "kind": "letter", "text": "ಳ", "p": 0.31}`.

### `GET /v1/children/{id}/next`

The next passage for the child: `{passage_id, reason, level}`. A difficulty band from the
placement level (middle band before any), moved up after two readings at 90% or more and down
after two under 70%; inside it, the passage with the most words that practise a weak skill,
skipping the last three read.

### `GET /v1/aksharas?lang=kn-IN&word=ಹಾರುತ್ತಿತ್ತು` · `POST /v1/practice`

Akshara practice. `aksharas` splits a word into the units the script is read in
(`core/aksharas.py`): `{"word": "ಹಾರುತ್ತಿತ್ತು", "aksharas": ["ಹಾ", "ರು", "ತ್ತಿ", "ತ್ತು"]}`. The app
plays each through `/v1/feedback/audio` (cached), then the whole word. `practice` (multipart:
`audio`, `word`, `lang`, optional `child_id`) scores one re-read of one word and returns
`{word, said, state}`; with `child_id` it teaches the learner model. Costs one Prisma call.

## Not built (deferred)

- Evon story generation.

## Still open

1. Keep `POST /v1/attempts` inline (one STT call, synchronous), or queue it? Inline is fine
   at demo scale.
2. Keep raw attempt audio on disk for admin review, or discard after scoring?
