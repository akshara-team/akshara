# Akshara

A reading screener for early-grade children in Kannada, Tamil and Hindi, built on Gnani AI's speech models, with a measured reliability report.

Entry for the [Great Indian AI Internship Challenge](https://www.gnani.ai/internship) (deadline Nov 10, 2026).

## The problem

- Only 23.4% of Class 3 children in rural India can read a Class 2 text (ASER 2024).
- NIPUN Bharat sets oral reading targets of about 35–54 correct words per minute.
- Measuring this today means a teacher listening to each child with a stopwatch.

## How it works

1. A short passage is read aloud by the child.
2. **Prisma v2.5** transcribes it word for word.
3. Akshara aligns the transcript to the passage, counts correct words per minute, and flags skipped or misread words.
4. **Timbre v3.0** reads passages aloud and says missed words correctly.

Speech-to-text tends to correct a misread word into the expected one, which hides the mistake. We measured how often: skipped and unrelated words are caught almost always, but a single wrong consonant only 8 times in 39. A pause-based re-check did not help, so the app says so on every result. Read [docs/WRITEUP.md](docs/WRITEUP.md) (one page) or [docs/RESULTS.md](docs/RESULTS.md) (all numbers).

## Status

| Stage | State |
|---|---|
| Word alignment and scoring | Done, with tests |
| Prisma and Timbre clients | Done, tested live |
| Reliability study (synthetic audio, 3 languages, 90 passages, 4 audio conditions) | Done, in [docs/RESULTS.md](docs/RESULTS.md) |
| Mitigation for autocorrected mistakes | Tried, does not help (result recorded) |
| HTTP API, storage, offline fixture provider, CI gate | Done |
| Reading screen, trace view, class summary, limits notice | Done (v0.1); microphone path untested live |
| **Web app** (`web/`, Vite + React + TS PWA) | Child flow, child home with saved progress, teacher screens and recovery states; mock + live modes; 46 tests, own CI job. See [web/README.md](web/README.md) |
| Missed-word audio | Done: `GET /v1/feedback/audio`, Timbre behind a content cache |
| Performance gate | Done: bundle budget in CI (73 kB JS / 78 kB total gzip) |
| Demo video | [docs/demo/akshara_demo.mp4](docs/demo/akshara_demo.mp4) |

**Where things stand, and what is next:** [docs/STATUS.md](docs/STATUS.md).

## Quick start

```bash
./run.sh install     # uv sync + npm install
cp .env.example .env # add your GNANI_API_KEY (optional: the fixture provider needs none)
./run.sh             # backend + web together; logs are tagged [backend] / [frontend]
```

The same commands are available through npm: `npm start`, `npm run dev`, `npm run live`,
`npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check`.

`./run.sh` runs the offline demo (fixture transcripts + mock web, **no credits**).
`./run.sh live` runs the real pipeline — Prisma transcription and Timbre audio — and costs
about 0.05–0.1 credits per attempt, capped by `AKSHARA_MAX_CALLS`.

Pieces, if you want them separately:

```bash
uv run pytest
uv run python scripts/go_no_go.py --dry-run   # no API calls
uv run uvicorn akshara.api.app:create_app --factory   # API on :8000 (offline fixture provider by default)
```

## Web app

```bash
cd web
npm install          # NODE_ENV must not be "production", or devDependencies are skipped
npm run dev          # http://localhost:5173, proxies /v1 to :8000
npm run lint && npm run typecheck && npm test && npm run build
```

Runs on fixtures by default (`VITE_API_MODE=mock`) so it works with **no backend at all**;
set `VITE_API_MODE=live` to talk to the API. Screens, data modes and known gaps:
[web/README.md](web/README.md).

## Docs

| File | What's in it |
|---|---|
| [docs/STATUS.md](docs/STATUS.md) | What is done, what is next, who owns what |
| [docs/WRITEUP.md](docs/WRITEUP.md) | One-page explanation |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Why each choice was made |
| [docs/WALKTHROUGH.md](docs/WALKTHROUGH.md) | One section per module |
| [docs/PLAN.md](docs/PLAN.md) | Plan and timeline |
| [docs/MILESTONES.md](docs/MILESTONES.md) | Checklist of what is done and what is next |
| [docs/RESULTS.md](docs/RESULTS.md) | Measured results and limits |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Components and data flow |
| [docs/GNANI_API.md](docs/GNANI_API.md) | Gnani API notes and quirks |
| [docs/WORKLOG.md](docs/WORKLOG.md) | Work log |
| [web/README.md](web/README.md) | Frontend: run modes, screens, known gaps |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Workflow and data rules |

## Gnani models used

- Prisma v2.5 (speech-to-text)
- Timbre v3.0 (text-to-speech)

## Data

Synthetic audio only. No real children's voices. See [CONTRIBUTING.md](CONTRIBUTING.md#data-rules).

## Team

Achindra and Daniel.

- **Achindra** — scorer, providers, service/store/API, the reliability studies, demo video.
- **Daniel** — the web app, the API contract, the frontend stack decision, and the Kannada and
  Tamil go/no-go passages.

#GnaniAI #GreatIndianAIInternshipChallenge
