# Status: what is done and what is next

*Last updated 2026-10-29. Keep this file current when work lands; it is the fastest way for
either of us to see where the project stands. The day-by-day plan is
[FINISH_PLAN.md](FINISH_PLAN.md); the log is [WORKLOG.md](WORKLOG.md).*

## What Akshara is now

A reading tutor, not only a screener. A teacher adds a child (a nickname, with a parent's
consent) and places them with a short ASER-style test. The child reads a story picked for their
level, part by part, and sees which words were right. Missed words are practised straight away:
split into aksharas, said by Timbre, read again. A learner model tracks which letters and sounds
each child knows and picks the next story. The teacher sees the class, listens to the marks
worth checking and corrects them, and can read how reliable the marks are. Evon writes
practice sentences for each child's weak sounds; a teacher approves each one first.

## Where things stand

| Area | State |
|---|---|
| Scorer (alignment, spelling-variant rules) | Done, tested |
| Prisma / Timbre clients, transcript and audio caches, call ledger and cap | Done |
| Reliability studies (90 passages, 4 audio conditions, chunked re-check) | Done: [RESULTS.md](RESULTS.md) |
| Script tables, per-word audio check (MMS), fusion scorer (Phases 1–3) | Built and measured; not in the app (fusion missed its pre-registered margins, so the app keeps Prisma's marks) |
| Learner model: skill graph, BKT mastery, ASER placement, next story (Phase 4) | Done, in the app; measured on simulated children |
| Microphone, live (WP0) | Done in Chrome with synthetic clips; one reading into a real mic still to do |
| Teacher data: children, profiles, readings (WP1) | Done |
| Child screens in the child's language (WP6) | Done, with spoken instructions; Kannada and Tamil text reviewed (familiar register), Hindi still a draft |
| Child buttons carry a picture | Done: one pictogram per action on every child button and link (`components/icons.tsx`) |
| Evon practice sentences | Built and tested; the batch has not run yet ([EVON_HOWTO.md](EVON_HOWTO.md)), so children get story sentences until it does |
| Placement and learner model in the app (WP2, WP3) | Done |
| Akshara practice with Timbre (WP4) | Done, checked live |
| Teacher review queue with word clips (WP5) | Done; not yet checked in a browser with a real recording |
| Trust: reliability page, consent, 30-day deletion, delete a child (WP7) | Done |
| FLS 2022 Grade 3 bands (WP8, D2) | Done; wired into the child profile and the dashboard status, per language (Hindi 35-54, Kannada 30-48, Tamil 28-49) |
| Offline readings, noise check (WP9) | Done |
| Stars and reading streak (WP9, D3) | Done; on the child home |
| End-to-end tests, Pages dry run, docs (WP10) | Done; the hands-on browser pass and Lighthouse are Checkpoint A |
| Public demo (GitHub Pages, mock mode) | Builds and serves under `/akshara/`; goes live when the repo is public |

## Who owns what

- **Achindra**: scorer, providers, service, store and API, the studies, demo video, docs.
- **Daniel**: the original web app, the API contract, the frontend stack, the Kannada and Tamil
  passages; now D4 (a test pass on his phone) and D6 (approve Evon's sentences).
- Claude writes most of the remaining code; see [FINISH_PLAN.md](FINISH_PLAN.md).

We enter as a pair (decided Oct 28). Both are interviewed separately, so each should be able to explain their own part.

## What is next, in order

1. **Checkpoint A** (Achindra, about 30 minutes): use the app as a teacher and as a child in
   live mode. Check that the right word plays in Review, switch the network off mid-story, try
   "Is it quiet here?", read one sentence into a real microphone, run Lighthouse.
2. **Daniel**: D1-D3 are merged (Kannada/Tamil text, FLS bands, rewards); left is D4 (a pass on his phone) and D6 (approve Evon's sentences).
3. **Hindi text review** (Achindra): `web/src/i18n/hi.json`.
4. **Run Evon's batch** (Kaggle's free 2×T4 or a rented GPU, see [EVON_HOWTO.md](EVON_HOWTO.md)), then approve its sentences in the app.
5. **Record the demo video** (Nov 1) in live mode.
6. **Go public, post** (Nov 2–3): make the repo public, turn on Pages, post the demo (drafts in
   [POST.md](POST.md)), share it for a week before the Nov 10 cutoff. **Submit by Nov 9.**

## How to run it

```bash
./run.sh install
./run.sh          # offline demo: fixture transcripts + mock web, no credits
./run.sh live     # real Prisma + Timbre, ~0.05-0.1 credits per attempt
./run.sh check    # the whole CI suite locally
```

## Current numbers

- **277 Python tests**, **180 web tests** (axe on 22 routes); CI runs both on every PR.
- End-to-end, one child from consent to deletion: `tests/test_end_to_end.py` (API) and
  `web/src/endToEnd.test.tsx` (screens, mock mode).
- Production web bundle: **112 kB JS / 125 kB total gzip** (budget 120 / 160), including the
  practice-sentence data, which loads only when needed.
- Ledger: **2,136** paid calls logged in `results/ledger.jsonl`. The `AKSHARA_MAX_CALLS` cap
  counts this file. Credits are not the limit (5,000 programme credits, about 0.05–0.1 a call).

## Known limits (stated in the app and the docs)

- Synthetic voices only: no child has used it, and no teacher has marked the same readings to
  measure agreement.
- A change in one sound is mostly not caught (8 of 39); the reliability page says so.
- Word clips in Review are estimated from pauses, since Prisma gives no word timings.
- Placement passages are short book blurbs, weaker evidence than the paper ASER test.
- Kannada and Tamil child text reviewed by a native speaker; Hindi is still a draft.
- No logins: one teacher per server. The noise thresholds are uncalibrated guesses.
