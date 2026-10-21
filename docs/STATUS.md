# Status — what is done and what is next

*Last updated 2026-10-21. Keep this file current when work lands; it is the fastest way for
either of us to see where the project stands.*

## Where things stand

| Area | State |
|---|---|
| Scorer with spelling-variant rules | Done, tested |
| Prisma / Timbre clients, call ledger and cap | Done |
| Reliability study (90 passages, 4 audio conditions) | Done — [RESULTS.md](RESULTS.md) |
| Chunked re-check mitigation | Tried; does not help; documented in [RESULTS.md](RESULTS.md) |
| FastAPI service, SQLite store, fixture provider, Docker, CI | Done |
| Web app (`web/`, Vite + React + TS PWA) | MVP: child flow, teacher screens, six recovery states, child home, saved progress |
| Missed-word audio (`GET /v1/feedback/audio`) | Done: Timbre behind a content cache |
| Bundle-size budget in CI | Done: 120 kB JS / 160 kB total gzip |
| **Deploy the demo** | **Blocked** — GitHub Pages needs repo admin (Achindra) |
| Story chunking (real parts) | Done: `parts` on passages, `part_index` scored per part |
| Accessibility pass | Done: skip link, focus on route change, `lang` on scripts, axe in tests |

## Who owns what

- **Achindra** — scorer, providers, service/store/API, the studies, demo video, docs backbone.
- **Daniel** — the web app, the API contract, the frontend stack decision, and the Kannada +
  Tamil go/no-go passages.

Both are interviewed separately, so each should be able to explain their own part.

## What is next, in order

1. **Deploy** — needs Achindra to enable Pages (Settings → Pages → Source: GitHub Actions) or an
   alternative host. Everything is ready apart from that switch.
2. **Submission track** — post the demo, make the repo public, fill in the form (both of us).

## How to run it

```bash
./run.sh install
./run.sh          # offline demo: fixture transcripts + mock web, no credits
./run.sh live     # real Prisma + Timbre, ~0.05-0.1 credits per attempt
./run.sh check    # the whole CI suite locally
```

## Current numbers

- **114 Python tests**, **80 web tests**; CI runs both jobs on every PR.
- Production web bundle: **73 kB JS / 78 kB total gzip**.
- Ledger: **1,930** paid calls logged in `results/ledger.jsonl` (both machines merged). The
  `AKSHARA_MAX_CALLS` cap counts this file, so with a cap of 2,500 about 570 calls are left
  before it needs raising. Credits themselves are not the limit (about 0.05-0.1 per call).

## Known limits (already stated in the docs)

Synthetic audio only, adults' voices not children's; near-sound misreads are often hidden by
the transcriber (measured: 8 of 39 caught); the teacher screens use invented demo data; the
child's progress is saved on this device only.
