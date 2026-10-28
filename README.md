# Akshara

A reading tutor for early-grade children in Kannada, Tamil and Hindi, built on Gnani AI's speech models, with a measured reliability report. It listens to a child read, helps straight away, and tells the teacher who needs help with what.

Entry for the [Great Indian AI Internship Challenge](https://www.gnani.ai/internship) (deadline Nov 10, 2026).

## The problem

- Only 23.4% of Class 3 children in rural India can read a Class 2 text (ASER 2024).
- NIPUN Bharat sets oral reading targets of about 35–54 correct words per minute.
- Measuring this today means a teacher listening to each child with a stopwatch.

## How it works

1. **The teacher adds a child**: a nickname, the class, the language, and the date a parent
   agreed. A short ASER-style placement (paragraph, story or words, letters) finds their level.
2. **The child reads a story** picked for that level, one part at a time. **Prisma v2.5**
   transcribes it word for word, and Akshara aligns the transcript to the text and marks each
   word right, different or skipped.
3. **Help right away.** Missed words are split into aksharas; **Timbre v3.0** says each one,
   then the whole word, and the child reads it again.
4. **A learner model** tracks which letters, vowel signs and conjuncts each child knows, and
   picks the next story.
5. **The teacher** sees the class, listens to the marks worth checking (a clip of just that
   word) and corrects them; a teacher's mark replaces the computer's.

The child screens are in the child's language. Readings made with no connection are kept and
sent later. Recordings are deleted after 30 days, and a teacher can delete a child's data at
once.

Speech-to-text tends to correct a misread word into the expected one, which hides the mistake. We measured how often: skipped and unrelated words are caught almost always, but a single wrong consonant only 8 times in 39. A pause-based re-check and a second acoustic check did not fix it, so the app says so: on every result, and on a "How reliable is this?" page built from the saved results. Read [docs/WRITEUP.md](docs/WRITEUP.md) (one page) or [docs/RESULTS.md](docs/RESULTS.md) (all numbers).

## Status

| Part | State |
|---|---|
| Scorer, Prisma and Timbre clients, caches, credit cap | Done, tested |
| Reliability studies (synthetic audio, 3 languages, 90 passages, 4 audio conditions) | Done, in [docs/RESULTS.md](docs/RESULTS.md) |
| Mitigations (chunked re-check, per-word acoustic check, fusion) | Tried and measured; not in the app, as they did not beat Prisma alone |
| Learner model: skill graph, mastery tracking, placement, next story | Done, in the app; measured on simulated children |
| Web app (`web/`, React PWA): child flow, practice, teacher class, profiles, placement, review queue, reliability page | Done, mock and live modes; 147 tests including axe on 20 routes |
| Consent, 30-day recording deletion, delete a child's data | Done |
| Offline readings, noise check | Done |
| End-to-end tests, one child from consent to deletion | Done (API and screens) |
| NIPUN speed bands, stars and streak | In progress (Daniel) |
| Demo video | [docs/demo/akshara_demo.mp4](docs/demo/akshara_demo.mp4) (an earlier version) |

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
| [docs/API_CONTRACT.md](docs/API_CONTRACT.md) | Every endpoint |
| [docs/FINISH_PLAN.md](docs/FINISH_PLAN.md) | The plan to Nov 10 |
| [docs/GNANI_API.md](docs/GNANI_API.md) | Gnani API notes and quirks |
| [docs/WORKLOG.md](docs/WORKLOG.md) | Work log |
| [web/README.md](web/README.md) | Frontend: run modes, screens, known gaps |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Workflow and data rules |

## Gnani models used

- Prisma v2.5 (speech-to-text)
- Timbre v3.0 (text-to-speech)

## Data

Synthetic audio only. No real children's voices, names or ID numbers. In the app, children are nicknames, kept only with a parent's consent. See [CONTRIBUTING.md](CONTRIBUTING.md#data-rules).

## Team

Achindra and Daniel.

- **Achindra** — scorer, providers, service/store/API, the reliability studies, demo video.
- **Daniel** — the web app, the API contract, the frontend stack decision, and the Kannada and
  Tamil go/no-go passages.

#GnaniAI #GreatIndianAIInternshipChallenge
