# 001 — Frontend stack: Vite + React + TypeScript (PWA)

*Status: proposed, awaiting sign-off with Achindra (due Oct 23). Owner: Daniel.*

## Decision

Build the frontend as a **Vite + React + TypeScript single-page app, shipped as
an installable PWA**. The app talks to the FastAPI backend over HTTP (see
[../API_CONTRACT.md](../API_CONTRACT.md)); it is deployed as static files.

## Why

- **The app is interactive and behind a mic, not a content site.** There is no
  SEO or server-rendering requirement, so Next.js pays for a server it doesn't
  use.
- **The browser APIs we need are first-class.** `MediaRecorder` for capturing
  the child's reading, `fetch` for uploading chunks and scoring, and (later)
  WebSocket for live word highlighting all work without a framework's help.
- **A PWA gives the "app-like" feel cheaply.** Installable home-screen icon,
  offline cache of the story text and its Timbre narration, no app-store step.
- **Static hosting matches the budget.** The backend (and Evon) is the only
  server; the frontend is a folder of files.
- **It scales to the teacher dashboard** without pulling in a second stack.

## Alternatives considered

| Option | Why not |
|---|---|
| Next.js | SSR/RSC and routing conventions we don't need; heavier build and mental model for an interactive mic app. |
| Streamlit | No real control over microphone capture or audio playback timing; weak for the demo video and the dashboard. |
| Plain HTML/JS | Fine for a spike, but the child screen + dashboard share state and routing; React earns its keep. |

## Interaction with other open decisions

- **Live vs recorded scoring** (ARCHITECTURE): build **record-then-score** first —
  simpler UI and cheaper on credits (a full attempt is one STT call). Keep the
  reading screen chunked (≤30 s per chunk, per the backend design rule) so a
  realtime mode can be added later without redesigning the flow.
- **Voice/story caching**: the PWA service worker should cache story audio and
  narrated feedback by their stable cache keys, mirroring the backend's caching.

## Follow-ups

- Confirm the concrete toolchain choices at scaffolding time: `vite` + `react` +
  `typescript`, `vite-plugin-pwa`, and a small router. No state library until a
  screen needs one.
- Revisit if Achindra's FastAPI needs same-origin hosting for cookies/auth; the
  demo has no auth, so CORS from a static origin is enough.
