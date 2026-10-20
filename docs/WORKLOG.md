# Work Log

Gnani evaluates and interviews each of us separately, so log what you did. Newest first. One line per piece of work is enough; link the PR or commit.

| Date | Who | What |
|---|---|---|
| 2026-10-20 | Achindra | Open passages: fetched StoryWeaver catalogue descriptions, added deterministic mistake planting (skip, near-sound, distant, half-word) with tests, built 90 study passages (156 planted mistakes) |
| 2026-10-20 | Achindra | Restructured into core/providers/api, added service, SQLite store, FastAPI app, fixture provider, Dockerfile, CI format check and an eval regression gate |
| 2026-10-18 | Achindra | Set up the repo: docs, word-alignment scorer with tests, Prisma client, go/no-go script |
| 2026-10-17 | Achindra | Researched the challenge, competitors and Gnani models; picked the reading-tutor idea |

## 2026-10-20: honest-limits state
Service marks words accepted only via a spelling-variant rule as `check` (dashed ? in the screen) and returns a fixed notice with each attempt, because the chunked re-check failed to expose near-sound misreads. 92 tests pass.
