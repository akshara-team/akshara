# Gnani API Notes

Official docs: https://docs.gnani.ai/api/introduction/introduction

## Auth

- Base URL: `https://api.vachana.ai`
- Header: `X-API-Key-ID: <key>`. Key from the dashboard at app.gnani.ai/voice.
- We read it from the `GNANI_API_KEY` env var (same name the official `gnani-vachana` SDK uses).

## Speech-to-text (Prisma v2.5), REST

`POST https://api.vachana.ai/stt/v3`, multipart form:

| Field | Value we use | Notes |
|---|---|---|
| `audio_file` | WAV clip | Max 60 s per docs; **keep under 30 s** (longer ones were rejected for other teams) |
| `language_code` | `hi-IN`, `kn-IN`, `ta-IN` | Required |
| `format` | `verbatim` | Default. `transcribe` rewrites numbers/dates; don't use it for reading |
| `bias_list` / `bias_score` | **not sent** | Would hide reading mistakes |

Response: `{"success": true, "request_id": "...", "timestamp": "...", "transcript": "..."}`

Errors: `{"success": false, "error": {"type": "...", "message": "..."}}`. 400 bad input, 403 key/credits, 429 rate limit, 500/503 retry with backoff.

Realtime: `wss://api.vachana.ai/stt/v3/stream`, 16-bit mono PCM, 1024-byte frames, settings sent as headers, 15-minute session cap.

## Text-to-speech (Timbre)

- REST: `POST /api/v1/tts/inference` returns audio. SSE: `/api/v1/tts/sse`. WebSocket: `wss://api.vachana.ai/api/v1/tts`.
- Fields: `text`, `voice`, `model`, `language`, `speed` (0.85–1.15), `audio_config`.
- v3.0 audio tags: https://docs.gnani.ai/api/TTS/tts-audio-tags. **TODO:** confirm the v3.0 model name and voice names before writing the client.
- Write numbers, dates and IDs as words, or they're mispronounced.

## Evon v3.3

- Weights: https://huggingface.co/gnani/gnani-evon-v3.3-30B-A3B (Apache 2.0, 30B MoE, ~3B active).
- Runs on vLLM; quantized GGUF versions exist. We serve it behind an OpenAI-compatible API.

## Known quirks (reported by other teams)

- Clips over ~30 s rejected despite the 60 s limit in the docs.
- HTTP 429 on two quick requests in a row. The exact message is "Only 1 active request is allowed at a time" (`RATE_LIMITED`), so one request at a time. Our client waits and retries up to 6 times.
- Timbre's REST WAV has `0xFFFFFFFF` in its RIFF and data sizes (streamed). Some readers and Prisma see it as empty or huge; the client rewrites the real sizes.
- Realtime partial transcripts need an undocumented `x-partials` header.
- Realtime `connected` event always reports 16 kHz.

## Credit rates

Measured from the dashboard (Oct 19-20, 2026). Gnani gives each participant 5,000 programme credits.

| Checkpoint | Credits used | Requests | Credits per request |
|---|---|---|---|
| 1 Timbre call + 1 Prisma call (4 s clip) | 0.34 | about 3 | about 0.11 |
| 36 Timbre clips + 36 Prisma calls | 6.77 | 73 | 0.093 |
| plus 36 Timbre clips (speed 0.85) and 6 Prisma variants (216 calls) | 20.15 | 325 | 0.053 for the added 252 |

- A request here is a short clip (under 10 s) or about 50 characters. Rates per second or per character are not separable from this data, because the dashboard shows one total.
- **At this rate the whole 5,000 is about 80,000 short requests, so credits are not the limiting resource for evaluation work.** Long audio, streaming and live demos are different and should be measured before assuming.
- `results/ledger.jsonl` logs every paid call (type, size) so costs can be matched to the dashboard.
