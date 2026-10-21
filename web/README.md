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

## Desktop layouts

Figma has desktop frames **only for the teacher side** (section 03). Sections 02 (child) and
04 (recovery) are phone-only — verified by listing every frame in the file (185 frames; the
66 at desktop width all belong to the teacher section, its wireframes, or the handoff).

So the teacher screens are **ported** from their frames, and the child/recovery screens are
**derived** from the same desktop language: 1280 shell, 40px inset, 32px column gap, 360 or
320 side column.

| Screen | Baseline | Layout |
|---|---|---|
| Teacher dashboard | frame | 40px inset, 3 stat cards, roster as a **5-column table** |
| Child profile | frame | **360** side + 808 main |
| Attempt details | frame | **320** side + 848 main |
| Select story | frame | **300** side + 868 main |
| Add / Edit child | frame | **340** purpose + 560 form |
| Role selection | derived | 360 (greeting + language) + main (roles + start) |
| Choose reader | derived | 360 (context) + main (readers + continue) |
| Reading | derived | 360 (story, part, Listen) + main (passage capped at 640px, mic) |
| Checking | derived | 360 (context) + main (waiting + passage preview) |
| After-part feedback | derived | 360 (progress + notice) + main (chips + practice) |
| Final results | derived | 360 (celebration + stats) + main (progress + practice) |
| Recovery | derived | 320 (title + context) + main (the 3 steps + actions) |

The shell is one responsive frame: 375 below 900px, 1280 with a 40px inset above. The teacher
top bar gains desktop navigation (Class / Story / Add child + a class badge); mobile uses a
back button. Which roster renders is decided in JS (`useIsDesktop`), so the DOM never contains
both the table and the card list.

## Theme

Every colour, size, space, radius, weight and duration lives in `src/theme/theme.css` as a
custom property; component and screen stylesheets only reference `var(--…)`. The one
exception is the 900 px breakpoint, which CSS cannot read from a variable inside `@media` —
it is documented there as `--breakpoint-desktop` and must be kept in sync.

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
- **Teacher data.** The dashboard reads `GET /v1/class/summary` when the API answers and falls
  back to the demo class otherwise; the other teacher screens are invented demo data, as the
  handoff specifies (the API has no children, roster or history endpoints yet).
- **Not built yet:** teacher screens do not persist; live mode reads a passage as one part
  (the API has no chunking); no performance budget or Lighthouse gate.

## Roadmap

Each phase is its own branch → PR → CI green on the branch → merge.

- [x] Phase 1 — class-summary wiring (`GET /v1/class/summary` → the dashboard)
- [ ] Phase 2 — real missed-word audio (`/v1/feedback/audio`, cached Timbre)
- [ ] Phase 3 — story chunking (real parts from the API)
- [ ] Phase 4 — bundle-size budget in CI
- [ ] Phase 5 — deploy the demo (GitHub Pages, mock mode)
- [ ] Phase 6 — accessibility pass (focus, skip link, live regions, axe)

## Tests

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

Vitest + Testing Library in jsdom. The suite covers the error boundaries, the real screen
copy, the mock fixtures' arithmetic, every teacher route, the recovery variants, the offline
redirect and the playback fallbacks — all offline.
