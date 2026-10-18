# Architecture

## Flow for one reading attempt

```
 Teacher picks child + level + language
            │
            ▼
 ┌─────────────────────┐   cached by (lang, level, story_id)
 │ Story store         │◄──────────────────────────────┐
 └─────────┬───────────┘                               │
           │ no story yet?                             │
           ▼                                           │
 ┌─────────────────────┐  strict JSON: {title, text}   │
 │ Evon v3.3 (vLLM)    │───────────────────────────────┘
 └─────────────────────┘
           │ story text
           ▼
 ┌─────────────────────┐  generated once, cached as audio file
 │ Timbre v3.0 TTS     │──► model reading played to the child
 └─────────────────────┘
           │
           ▼
   Child reads aloud in the browser (mic, ≤30 s per chunk)
           │
           ▼
 ┌─────────────────────┐  format=verbatim, NO bias_list
 │ Prisma v2.5 STT     │
 └─────────┬───────────┘
           │ transcript
           ▼
 ┌─────────────────────┐  word alignment (src/akshara/align.py)
 │ Scorer              │──► WCPM, accuracy, per-word marks
 └─────────┬───────────┘
           │ missed / misread words
           ▼
 ┌─────────────────────┐  "<excited>" praise + slow, clear word
 │ Timbre v3.0 TTS     │──► feedback audio (cached per word)
 └─────────────────────┘
           │
           ▼
   Attempt saved → teacher dashboard (progress vs NIPUN targets)
```

## Components

| Component | Tech | Owner | State |
|---|---|---|---|
| Scorer (normalise, align, WCPM) | Python, `src/akshara/align.py` | Achindra | Done |
| Prisma client | `httpx`, `src/akshara/stt.py` | Achindra | Done, untested live |
| Timbre client | `httpx` | Achindra | Todo |
| Evon story generator | vLLM or llama.cpp, OpenAI-compatible API | Achindra | Todo |
| Backend API | FastAPI | Achindra | Todo |
| Storage | SQLite (children, stories, attempts) + audio files on disk | Achindra | Todo |
| Frontend: child reading screen | TBD | Partner | Todo |
| Frontend: teacher dashboard | TBD | Partner | Todo |

## Design rules

1. **Evon output is always strict JSON with a length cap.** Validate it; on failure, retry once, then fall back to a hand-written story from the seed bank. Evon is weak at following instructions.
2. **Never send `bias_list` to Prisma for reading attempts.** Boosting the story's words hides the child's mistakes.
3. **Cache everything that costs credits.** Story audio is keyed by story id + voice; feedback audio by word + voice; transcripts by audio hash.
4. **Chunk long readings to ≤30 s** (Prisma rejects longer clips in practice). Split on sentence boundaries; the child reads one chunk at a time.
5. **The scorer is pure code with tests.** No LLM in the scoring path, so scores are repeatable and explainable.

## Scoring

- Text is normalised (Unicode NFC, punctuation and dandas removed, zero-width joiners removed) and split on whitespace.
- The transcript is aligned to the story with word-level edit distance. Each story word is marked `correct`, `substituted` or `skipped`; extra spoken words are `inserted`.
- **WCPM** = correct words ÷ reading time in minutes.
- Accuracy = correct words ÷ story words.

Known gap: Indian-language words can differ by a small spelling variation (nukta, vowel sign) that Prisma may produce either way. If the go/no-go test shows many false flags from this, add a per-language "close enough" rule (e.g. character edit distance ≤ 1 on long words) and measure the trade-off.

## Open decisions

| Decision | Options | Decide by |
|---|---|---|
| Where Evon runs | Modal + vLLM (we already deploy Helix there) · quantized GGUF locally · hosted endpoint if Gnani offers one | Oct 23 |
| Frontend stack | Next.js · plain React + Vite · Streamlit for a fast first version | Oct 23 |
| Live vs recorded scoring | Record then send (simpler, cheaper) · realtime WebSocket (shows words light up as they're read) | After go/no-go |
| Timbre voice per language | Pick by ear in week 2 | Oct 30 |
