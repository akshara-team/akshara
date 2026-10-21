# Milestones

Check off as each one is done and verified. Dates are targets; deadline Nov 10, 2026, 11:59 PM IST.

## M0. Foundation (done)

- [x] Scorer with spelling-variant rules, tests
- [x] Prisma and Timbre clients, call ledger and cap
- [x] First reliability study: 7 audio conditions, context experiment ([RESULTS.md](RESULTS.md))
- [x] Restructure: core / providers / service / store / API, fixture provider, CI, Dockerfile, eval gate

## M1. Bigger study on open passages (Oct 21–23)

- [x] 90 passages from StoryWeaver descriptions with sources
- [x] Planting for skip, near-sound, distant, half-word, with tests
- [x] Audio generated for all 90 passages
- [x] Base condition transcribed and scored, per-type catch table (87 of 90 clips; 3 blocked by a Cloudflare 403); written up in RESULTS.md with the isolated-word control
- [x] Phone 8 kHz, noise (5 dB) and child-proxy (+4 semitones) conditions on the open set
- [x] Write-up in RESULTS.md; compared to the first study
- [x] Repeats and self-corrections: planting, scoring and a 30-passage set built, audio made and transcribed (12/14 repeats and 14/15 self-corrections kept in the transcript)

## M2. Mitigation (Oct 23–27)

- [x] Prediction written down before running ([PREDICTIONS.md](PREDICTIONS.md))
- [x] Pause finder on the audio (no word timings from Prisma); finding: fluent Timbre speech has no word-level pauses (1–4 segments per passage), so the mitigation test needs halting audio built from separately synthesised chunks joined with silences
- [x] Chunked re-check pass (`mitigation.py`)
- [x] Catch and false-flag rates compared with the whole-sentence pass on the same clips
- [x] Result recorded: it does not help (RESULTS.md); next step is to design the product around that limit

## M3. Product (Oct 27–Nov 1)

- [x] "Check this word" state in the service: a word accepted only through a spelling-variant rule is marked `check`; every result carries a notice that subtle mispronunciations can be hidden
- [x] Browser reading screen: mic or WAV upload, green / red words (uncertain state shown as a dashed "?"); checked in a browser with a replayed reading, microphone path not yet tried live
- [x] Per-attempt trace view (word, what was heard, result)
- [x] Class summary view
- [x] Runs end to end on live Prisma (6 calls, `scripts/live_check.py`): one clip per language, clean and 8 kHz phone band, identical word marks in both; Timbre ran earlier when the clips were made
- [x] First usable version (v0.1) tagged (local tag; push with the next push)

## M4. Demo and docs (Nov 1–3 for the post, then polish)

- [x] 60 s demo video (`docs/demo/akshara_demo.mp4`, silent, captioned; built by `scripts/make_demo_video.py` from slides, saved results and two screenshots of the real app; no microphone or before/after clip, since the transcriber hides the interesting case)
- [x] Written explanation, models used, honest limits ([WRITEUP.md](WRITEUP.md))
- [x] Caption drafts for LinkedIn and X ([CAPTIONS.md](CAPTIONS.md))
- [ ] Post live by about Nov 3
- [x] `docs/DECISIONS.md` (decision log)
- [x] Walkthrough per module ([WALKTHROUGH.md](WALKTHROUGH.md))
- [ ] Repo made public

## M5. Submit (by Nov 9)

- [x] Headline numbers regenerate from cached results (`scripts/check_numbers.py`, run in CI; covers catch counts for every condition, isolated control, pause finder; other figures are in the saved reports)
- [x] Final check of repo, commits and docs for stray tool names (scan clean on Oct 20; repeat before the last push)
- [ ] Submission form filled with post link
- [ ] Submitted before Nov 10, 11:59 PM IST

## M6. Web app (MVP)

The frontend for the Figma handoff ("Akshara · Product UI"), in [`web/`](../web). Every phase
is its own branch → PR → CI green on the branch → merge. Details: [web/README.md](../web/README.md).

**Built**

- [x] 17 design-system components and 12 screens: child flow (role selection, choose reader,
      reading, checking, feedback, results), six recovery states, teacher dashboard, story
      picker, child profile and history, attempt details, add/edit child
- [x] API seam with a mock adapter (the handoff's demo attempt) and a live adapter for `/v1`
- [x] Per-screen error boundaries so one broken screen leaves the rest working
- [x] `web` CI job: npm ci, lint, typecheck, 27 tests, build
- [x] Desktop teacher layout, offline redirect, real Listen audio (model audio with a
      device-voice fallback)
- [x] Desktop layouts taken from the design's desktop frames: dashboard with a 5-column roster
      table, and 360/808, 320/848, 300/868 and 340/560 workspaces on the other teacher screens
- [x] Desktop layouts for the child flow and recovery, derived from the teacher desktop
      language (the design has no desktop frames for those sections)
- [x] One theme file (`web/src/theme/theme.css`): every colour, size, space, radius, weight
      and duration is a custom property; component and screen CSS only use `var(--…)`

**Phases**

- [x] Phase 1 — class-summary wiring: `GET /v1/class/summary` feeds the teacher dashboard
      through a tested `toRoster` mapper, with the demo class as the fallback
- [ ] Phase 2 — `GET /v1/feedback/audio`: Timbre audio behind a cache, so Listen plays the model
- [ ] Phase 3 — story chunking: `split_parts`, `part_index` on attempts, parts from the API
- [ ] Phase 4 — performance gate: a bundle-size budget in CI
- [ ] Phase 5 — deploy the demo (GitHub Pages, mock mode) for the post
- [ ] Phase 6 — accessibility pass: focus, skip link, live regions, axe

## Stretch

- [ ] Second opinion from an open acoustic model (only if there is slack)
- [ ] Ask Gnani on Discord about open read-speech datasets (draft in [GNANI_MESSAGES.md](GNANI_MESSAGES.md); you send it)
- [ ] Report the Cloudflare 403 on some clips to Gnani (draft in [GNANI_MESSAGES.md](GNANI_MESSAGES.md); you send it)
