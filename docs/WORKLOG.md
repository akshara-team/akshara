# Work Log

Gnani evaluates and interviews each of us separately, so log what you did. Newest first. One line per piece of work is enough; link the PR or commit.

| Date | Who | What |
|---|---|---|
| 2026-10-21 | Partner | Built the web app (`web/`): Vite + React + TS PWA with the child flow, teacher screens and six recovery states from the Figma handoff, on mock + live API adapters with per-screen error boundaries |
| 2026-10-21 | Partner | Added the `web` CI job; fixed `check_numbers.py` filename drift so CI is green (92 Python + 27 web tests) |
| 2026-10-21 | Partner | Phase 1 of the web MVP: `GET /v1/class/summary` wired into the teacher dashboard via a tested `toRoster` mapper, with the demo class as the fallback |
| 2026-10-21 | Partner | Desktop layouts from the Figma desktop frames (roster table on the dashboard, 360/808, 320/848, 300/868, 340/560 workspaces) and moved every CSS value into `web/src/theme/theme.css` as a custom property |
| 2026-10-21 | Partner | Generated the Kannada + Tamil go/no-go clips with Timbre TTS (24 clips, mono 16 kHz) via `scripts/make_test_audio.py`, replacing hand recording; one clip fixed by re-rendering after a Cloudflare 403 |
| 2026-10-21 | Partner | Ran the go/no-go test on the synthetic clips: Kannada 100% catch / 1% false-flag, Tamil 95% / 5% (loose) — both pass; result and decision written into GO_NO_GO.md |
| 2026-10-20 | Achindra | Open passages: fetched StoryWeaver catalogue descriptions, added deterministic mistake planting (skip, near-sound, distant, half-word) with tests, built 90 study passages (156 planted mistakes) |
| 2026-10-20 | Achindra | Restructured into core/providers/api, added service, SQLite store, FastAPI app, fixture provider, Dockerfile, CI format check and an eval regression gate |
| 2026-10-19 | Partner | Wrote 20 Kannada + 20 Tamil go/no-go passages with planted errors (`data/go_no_go/passages.jsonl`); dry run passes 100% catch / 0% false flags. Drafted the frontend stack decision ([decisions/001-frontend-stack.md](decisions/001-frontend-stack.md)) and the FastAPI contract ([API_CONTRACT.md](API_CONTRACT.md)). Added `scripts/record.py` to record the clips |
| 2026-10-18 | Achindra | Set up the repo: docs, word-alignment scorer with tests, Prisma client, go/no-go script |
| 2026-10-17 | Achindra | Researched the challenge, competitors and Gnani models; picked the reading-tutor idea |

## 2026-10-20: honest-limits state
Service marks words accepted only via a spelling-variant rule as `check` (dashed ? in the screen) and returns a fixed notice with each attempt, because the chunked re-check failed to expose near-sound misreads. 92 tests pass.

## 2026-10-20: live check
scripts/live_check.py: real app plus Prisma, 3 clips x (clean, 8 kHz), 6 calls. Word marks identical in both conditions, no errors. Microphone path still untried.

## 2026-10-20: demo video
Built a 60 s silent demo from slides plus two real screenshots (app served offline from cached transcripts, WAV upload through a real browser). Timbre has no English voice, so no narration.

## 2026-10-20: docs refreshed
README status, PLAN outcome note, Gnani message drafts (docs/GNANI_MESSAGES.md).
