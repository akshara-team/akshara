# Contributing

## Setup

```bash
git clone https://github.com/Achindra2003/akshara.git
cd akshara
uv sync
cp .env.example .env    # put the API key in .env, never in code
uv run pytest
```

## Workflow

- Branch from `main`, open a PR, the other person reviews. Small PRs.
- CI runs the tests and the go/no-go dry run. Keep it green.
- Add a line to [docs/WORKLOG.md](docs/WORKLOG.md) for each piece of work.

## Data rules

The challenge allows **synthetic data only**. In this repo:

- **No real children's voices.** Test recordings are our own adult voices or Timbre-generated audio.
- No real names, phone numbers, Aadhaar or PAN numbers. Demo children get made-up names.
- No one else's recordings without their written OK, and even then prefer not.
- Audio files are git-ignored by default. Commit only what's needed and clearly synthetic.

## Credits

We share about ₹1000 of Gnani credits. Before anything that calls the API in a loop:

1. Check the rates in [docs/GNANI_API.md](docs/GNANI_API.md#credit-rates).
2. Make sure results are cached so re-runs are free.
3. Tell the other person.

## Code

- Python 3.11, formatted and linted with `uv run ruff check .` and `uv run ruff format .`.
- Scoring code stays pure (no network, no LLM) and tested.
