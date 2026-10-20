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

Speech-to-text tends to correct a misread word into the expected one, which hides the mistake. Measuring and reducing that is the main work. Results so far are in [docs/RESULTS.md](docs/RESULTS.md).

## Status

| Stage | State |
|---|---|
| Word alignment and scoring | Done, with tests |
| Prisma and Timbre clients | Done, tested live |
| Reliability study (synthetic audio, 3 languages) | First results in [docs/RESULTS.md](docs/RESULTS.md) |
| Mitigation for autocorrected mistakes | Planned |
| Reading screen and class summary | Not started |

## Quick start

```bash
uv sync
cp .env.example .env        # add your GNANI_API_KEY
uv run pytest
uv run python scripts/go_no_go.py --dry-run   # no API calls
```

## Docs

| File | What's in it |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Plan and timeline |
| [docs/RESULTS.md](docs/RESULTS.md) | Measured results and limits |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Components and data flow |
| [docs/GNANI_API.md](docs/GNANI_API.md) | Gnani API notes and quirks |
| [docs/WORKLOG.md](docs/WORKLOG.md) | Work log |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Workflow and data rules |

## Gnani models used

- Prisma v2.5 (speech-to-text)
- Timbre v3.0 (text-to-speech)

## Data

Synthetic audio only. No real children's voices. See [CONTRIBUTING.md](CONTRIBUTING.md#data-rules).

## Team

Achindra and Daniel.

#GnaniAI #GreatIndianAIInternshipChallenge
