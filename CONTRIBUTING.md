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

- **Branch, never push to `main`.** `git switch -c feat/<short-name> main` → work → commit →
  `gh pr create` → CI runs on the branch → merge only when it is green (squash, delete the branch).
- The other person reviews. Small PRs.
- CI runs two jobs, both must pass: `test` (Python) and `web` (npm ci, lint, typecheck, test,
  build). Keep them green.
- Add a line to [docs/WORKLOG.md](docs/WORKLOG.md) for each piece of work.
- Update the docs in the same PR when behaviour changes: this file, `README.md`,
  [docs/MILESTONES.md](docs/MILESTONES.md) (what is done and what is next) and
  [web/README.md](web/README.md) for frontend work.

## Frontend

```bash
cd web && npm install          # NODE_ENV must not be "production", or devDependencies are skipped
npm run lint && npm run typecheck && npm test && npm run build
```

- The app runs on fixtures by default (`VITE_API_MODE=mock`), so it needs no backend and no
  credits. `VITE_API_MODE=live` talks to the API through the dev proxy.
- Screens never call `fetch` directly — go through the API seam in `web/src/api/index.ts`.
- Every route is wrapped in its own error boundary; keep it that way.
- No emoji: icons are SVGs in `web/src/components/icons.tsx`.

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

**Tests never spend credits.** They use the offline fixture provider and fakes. Backend
end-to-end checks use `AKSHARA_PROVIDER=fixture` (0 credits). Only a deliberate live check
costs anything, and it should be one or two calls, not a loop.

## Code

- Python 3.11, formatted and linted with `uv run ruff check .` and `uv run ruff format .`.
- Scoring code stays pure (no network, no LLM) and tested.
- TypeScript: `npm run typecheck` and `npm run lint` must pass before a PR.
