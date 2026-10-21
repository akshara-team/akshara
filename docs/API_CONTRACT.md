# API Contract (proposal)

*Status: draft for review with Achindra. Owner: Partner. The FastAPI backend is
his; this doc is the frontend's request for the shapes it will consume.*

Goal: agree the endpoints and JSON before the backend exists, so the web app
(and a future mobile app) plug straight in. The recommended wire format reuses
the scorer's dataclasses (`Score`, `WordMark` in `src/akshara/align.py`)
one-to-one, so FastAPI can serialise `score(...)` with almost no translation.

## Conventions

- Base path `/api`. JSON everywhere except audio upload/download.
- Error envelope mirrors Gnani's, so one handler covers both:
  `{"success": false, "error": {"type": "...", "message": "..."}}`. Success
  responses return the payload directly (no envelope) for brevity.
- Audio in: `multipart/form-data`, one clip per attempt, **≤ 30 s** (the backend
  chunks long readings at sentence boundaries — design rule 4). Accept `audio/wav`
  and the browser's `audio/webm;codecs=opus` from `MediaRecorder`.
- Audio out: `audio/wav`.
- No auth for the demo. Children are made-up; no real names or IDs (data rules).
- Language codes: `hi-IN`, `kn-IN`, `ta-IN` (same as the STT client).

## Endpoints

### `GET /api/stories?lang=kn-IN&level=1`

Returns a story, split into reading chunks. Chunks are the unit the child reads
and the unit an attempt is scored against.

```json
{
  "id": "kn-042",
  "title": "ಮಳೆಯ ದಿನ",
  "lang": "kn-IN",
  "level": 1,
  "chunks": [
    {"index": 0, "text": "ರಾಮು ಬೆಳಿಗ್ಗೆ ಶಾಲೆಗೆ ಹೋದನು."},
    {"index": 1, "text": "ಅಲ್ಲಿ ಅವನು ಒಂದು ಹೂವು ನೋಡಿದನು."}
  ]
}
```

### `GET /api/stories/{id}/audio?chunk=0`

The cached Timbre narration for the story (or one chunk). Cache key: story id +
voice, per design rule 3. Returns `audio/wav`, or the full story audio if
`chunk` is omitted.

### `POST /api/attempts` (multipart)

Fields: `story_id`, `chunk_index`, `child_id`, `audio` (file). Runs Prisma
(verbatim, **no `bias_list`**) then the pure scorer.

```json
{
  "attempt_id": "a_7f1c",
  "story_id": "kn-042",
  "chunk_index": 0,
  "wcpm": 42.5,
  "accuracy": 0.86,
  "total_words": 7,
  "correct": 6,
  "duration_s": 9.9,
  "marks": [
    {"op": "correct", "ref_index": 0, "ref_word": "ರಾಮು", "said": "ರಾಮು"},
    {"op": "skipped", "ref_index": 1, "ref_word": "ಬೆಳಿಗ್ಗೆ", "said": null}
  ],
  "missed_words": [
    {"word": "ಬೆಳಿಗ್ಗೆ", "feedback_audio_url": "/api/feedback/audio?lang=kn-IN&word=ಬೆಳಿಗ್ಗೆ"}
  ]
}
```

`marks[].op` ∈ `correct | substituted | skipped | inserted`, with
`ref_index = null` for inserted words — exactly `WordMark`. `wcpm` is `null`
when the duration is unknown.

Where an attempt spans several chunks, the client posts one `POST /api/attempts`
per chunk and the backend aggregates for the dashboard.

### `GET /api/attempts?child_id=c_12&limit=20`

Attempt history (newest first) for the progress view. Same attempt shape,
summary fields only (`attempt_id`, `story_id`, `wcpm`, `accuracy`, `created_at`).

### `GET /api/children/{id}/progress`

```json
{
  "child_id": "c_12",
  "languages": {
    "kn-IN": {"attempts": 8, "mean_wcpm": 38.2, "target_wcpm": [35, 54], "trend": "up"}
  }
}
```

`target_wcpm` is the NIPUN oral-reading band; the dashboard shows the child
against it.

### `GET /api/feedback/audio?lang=kn-IN&word=ಬೆಳಿಗ್ಗೆ`

Cached Timbre clip of one word, in the encouraging voice. Cache key: word +
voice (design rule 3). Returns `audio/wav`. This is what the child hears after a
missed word.

## Open questions for Achindra

1. Does `POST /api/attempts` do the STT call inline (simple, ~1 request per
   attempt) or queue it? Inline is fine at demo scale and keeps the contract
   synchronous.
2. Should stories expose a `chunks` split, or should the client split on sentence
   boundaries? Backend splitting keeps the ≤30 s rule in one place.
3. Storage of raw attempt audio: keep on disk for admin review, or discard after
   scoring? Affects disk, not the wire format.
4. Evon story generation is out of scope here — this contract assumes a story
   with text and a child id already exist.
