# Akshara

**A reading screener and practice tool for early-grade children in Kannada, Tamil and Hindi, built on Gnani AI's speech models, with a measured reliability report.**

Entry for the [Great Indian AI Internship Challenge](https://www.gnani.ai/internship) (deadline Nov 10, 2026).

## The problem

- Only **23.4% of Class 3 children in rural India can read a Class 2 text** (ASER 2024).
- NIPUN Bharat sets oral reading targets of about **35–54 correct words per minute**.
- Measuring this today means a teacher listening to each child with a stopwatch. Existing AI tools don't cover Kannada or Tamil.

## How it works

1. **Evon v3.3** writes a short story at the child's level, in Kannada, Tamil or Hindi.
2. **Timbre v3.0** reads it aloud once, with expression. The audio is cached.
3. The child reads the story aloud. **Prisma v2.5** transcribes it word for word.
4. Akshara lines the transcript up against the story, counts **correct words per minute**, and flags skipped or misread words.
5. Timbre says the missed words correctly, in an encouraging voice.
6. A **teacher dashboard** tracks each child against the NIPUN targets.

## Status

| Stage | State |
|---|---|
| Word alignment and WCPM scoring | Done, with tests |
| Prisma client | Done (not yet tried with a live key) |
| Go/no-go test (does Prisma catch reading mistakes?) | **Next** — see [docs/GO_NO_GO.md](docs/GO_NO_GO.md) |
| Evon hosting | Not started |
| Story generation, read-aloud, feedback loop | Not started |
| Teacher dashboard | Not started |

## Quick start

```bash
uv sync
cp .env.example .env        # add your GNANI_API_KEY
uv run pytest               # run the tests
uv run python scripts/go_no_go.py --dry-run   # check the test pipeline without using credits
```

## Docs

| File | What's in it |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Research, why this idea, timeline, who does what |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Components, data flow, open decisions |
| [docs/GO_NO_GO.md](docs/GO_NO_GO.md) | The week-1 test that decides if we build this |
| [docs/EVALS.md](docs/EVALS.md) | What we measure and publish |
| [docs/GNANI_API.md](docs/GNANI_API.md) | Gnani API notes and known quirks |
| [docs/WORKLOG.md](docs/WORKLOG.md) | Who did what (each of us is evaluated separately) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Workflow and data rules |

## Gnani models used

| Model | Used for |
|---|---|
| Prisma v2.5 (speech-to-text) | Transcribing the child's reading, verbatim |
| Timbre v3.0 (text-to-speech) | Reading stories aloud; saying corrected words |
| Evon v3.3 (LLM, self-hosted) | Writing level-appropriate stories |

## Data

All recordings are synthetic or our own adult voices. We do not record or store real children's voices. See [CONTRIBUTING.md](CONTRIBUTING.md#data-rules).

## Team

- **Achindra** — backend, scoring, Evon hosting, Hindi
- **Partner** — Kannada and Tamil content, frontend, demo video

#GnaniAI #GreatIndianAIInternshipChallenge
