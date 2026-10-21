# Akshara web app

The child and teacher frontend for Akshara: a Vite + React + TypeScript PWA that talks to
the FastAPI backend in `../src/akshara/api`.

## Run it

```bash
npm install          # NODE_ENV must not be "production", or devDeps are skipped
npm run dev          # http://localhost:5173, proxies /v1 to :8000
```

Two data modes, chosen by `VITE_API_MODE` in `.env` (see `.env.example`):

- **`mock`** (default) — the app runs with no backend at all, on fixtures that reproduce the
  Figma handoff's demo attempt (Aarav, 20 words, 18 correct, 42 WCPM, 90%).
- **`live`** — talks to the real API. For the backend: `uv run uvicorn akshara.api.app:create_app --factory`
  (dev proxy handles CORS).

## Screens

Child flow: role selection → choose reader → reading → **checking** → after-part feedback →
final results. Recovery: microphone permission, story loading, connection delay, offline,
speech-recognition failure, service error (`/recovery/:kind`). Teacher: dashboard, story
picker, child profile and history, attempt details, add/edit child.

Teacher screens use the design's desktop layout from 900 px up; the child screens stay a
375 px column, matching the Figma frames.

## Layout

```
src/
  api/        types, live adapter (/v1), mock adapter + fixtures, teacher demo data
  audio/      MediaRecorder -> 16 kHz WAV recorder helpers, playback
  components/ 17 design-system components (Figma section 05) + error boundaries
  screens/    child/, recovery/, teacher/
  state/      session (parts, attempts, pending recording), offline redirect
  theme/      design tokens and script font helpers
```

## Things worth knowing

- **Error boundaries per screen.** Each route is wrapped in its own boundary keyed by
  pathname, so one broken screen leaves the shell and the other screens working.
- **The API seam** is `src/api/index.ts`. Screens never call `fetch` directly.
- **No emoji.** Every icon is an SVG in `components/icons.tsx`.
- **Uncertain words.** `WordChip` has a fourth, dashed state for the scorer's `check` flag
  (a word counted correct only via a spelling variant). The Figma library has only
  correct/substituted/skipped.
- **Listen** asks the backend for Timbre audio (`/v1/feedback/audio`) and falls back to the
  device voice; it says so when neither is available.
- **Not built yet:** teacher screens do not persist; live mode reads a passage as one part
  (the API has no chunking); no performance budget or Lighthouse gate.

## Tests

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

Vitest + Testing Library in jsdom. The suite covers the error boundaries, the real screen
copy, the mock fixtures' arithmetic, every teacher route, the recovery variants, the offline
redirect and the playback fallbacks — all offline.
