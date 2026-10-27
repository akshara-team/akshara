# Finish plan (Oct 26 – Nov 10, 2026)

Goal: turn Akshara from a reading screener into a complete product that a child and a teacher
can use end to end, with the research from Phases 2–4 inside the app. Claude writes the code;
the bottlenecks are review, native-language checks and a few decisions.

Why these features: every reading product that has shipped at scale (Google Read Along,
Wadhwani AI's Vaachan Samiksha, Microsoft Reading Progress and Reading Coach, Amira, Ello) has
the same six parts. Akshara has strong measurement and parts of three others. The research and
sources are in the Oct 26 session notes in `docs/WORKLOG.md`.

| Part | What shipped products do | Akshara now | Work package |
|---|---|---|---|
| Two loops | child practises, teacher assesses and acts | child loop only; teacher screens use invented data | WP1 |
| Teacher can hear and override | Reading Progress: play any word, change the mark | none | WP5 |
| Placement and levelled content | Ello, Read Along, Pratham TaRL | code exists, not in the app | WP2, WP3 |
| Help aimed at the child's mistakes | Diya, Reading Coach challenge words, Ello sound breakdown | Listen button only | WP4 |
| Real conditions | offline on 1 GB phones, child's language, spoken prompts | English UI, online only | WP6, WP9 |
| Trust | published accuracy, child privacy | strong report, not in the app; no consent or retention | WP7 |

## Rules for every package

- One branch per package, PR, CI green, merge to `main` (the existing workflow).
- Works in **both** modes: `live` (real API) and `mock` (fixtures). The public demo on GitHub
  Pages is mock mode, so every new screen needs realistic fixture data.
- Tests for every new endpoint, rule and screen. No Gnani calls in tests or CI.
- Credits: Timbre clips are cached by content; a run of more than ~50 calls is asked for first.
- Scorer stays pure (`text.py`, `align.py`). New decision logic goes in new pure modules.
- Each package ends with a `docs/WORKLOG.md` entry.

## Step 0. Housekeeping (Oct 26, 1 h)

- Merge PR #15 and `feat/learner` (which already contains `feat/evidence` and
  `feat/script-tables`) into `main`, so new work starts from one base.
- Move the untracked study logs and transcripts into `results/` commits or `.gitignore`; delete
  `dump.txt` and the `baton-*.txt` session dumps from the working copy (after asking).
- Done when: `main` has Phases 1–4, CI is green, `git status` is clean.

## WP0. Microphone works live (Oct 26, 1–2 h)

- Check the browser recording path end to end in `live` mode: permission, recording format,
  upload, scoring. Fix what breaks (sample rate, WebM/Opus to WAV conversion, file size).
- Claude tests the upload path with synthetic WAVs through Chrome; **Achindra reads one
  sentence into the mic** to confirm the real device path.
- Done when: one real microphone reading in each language scores and shows words.

## WP1. Real teacher data (Oct 27, ½ day)

- Migration 3: `learners` gains `grade`, `display_name` (an alias, never a real name),
  `consent_at`, `created_at`. New tables are added by the packages that need them.
- Endpoints: `GET/POST/PATCH /v1/children`, `GET /v1/children/{id}`,
  `GET /v1/children/{id}/attempts`, `GET /v1/attempts/{request_id}` (exists).
- Web: dashboard, child profile, attempt details and add/edit child read and write the API;
  `teacherData.ts` becomes the mock adapter only.
- Done when: a child added in the teacher view appears in the child flow, and their readings
  show in their profile after a reload.

## WP2. Placement on the first visit (Oct 28, ½ day)

- `learner/placement.py` decides; this package feeds it. Items per language come from the
  curriculum (`learner/skills.py`): 5 letters, 5 words, one paragraph, one story at each level.
- Short utterances (single letters) are where speech recognition is weakest. So letters and
  words are read **as one row** in one recording, and the teacher can tap a word to correct
  it, as in the ASER tool, which is teacher-run anyway.
- Migration: `placements` table (child, level, uncertain, log, created_at).
- Web: a placement flow before the first story; the level shows on the child profile and the
  dashboard; `uncertain` placements show a "listen" prompt for the teacher.
- Done when: a new child is placed in at most 4 recordings, and the level drives WP3.

## WP3. Learner model in the app (Oct 28, ½–1 day)

- After each scored attempt, update mastery per skill with `learner/bkt.py`
  (`observe(skills, result)`); teacher overrides from WP5 are strong evidence (`teacher=True`).
- Migration: `skill_state` table (child, skill, p, updated_at).
- `GET /v1/children/{id}/next` picks the next passage: right level (`core/difficulty.py`),
  most practice on weak skills, nothing read in the last 3 sessions.
- Web: child profile shows "working on" letters/sounds (the 3 weakest skills seen at least
  twice) and "learned" ones; the child home's **Read a story** uses `/next`.
- Marks come from Prisma in all three languages. The fused scorer needs the evidence model,
  which is not live (see Optional), and its Hindi result waits on the held-out clips.
- Done when: two simulated children with different mistakes get different next passages.

## WP4. Akshara practice (Oct 29, ½ day)

- After a reading, the child gets up to 3 missed words (Reading Coach's idea, sized for a
  Class 2 child). For each: the word is split into aksharas (`core/aksharas.py`), Timbre says
  each akshara and then the whole word, and the child reads the word again.
- The re-read is scored on its own (a one-word attempt) and updates the learner model.
- Timbre clips per akshara are cached by content; a passage's practice clips are made once.
- Done when: a red word can turn green after practice, in all three languages.

## WP5. Teacher review queue with word clips (Oct 29, 1 day)

- Keep the reading's audio (with retention, WP7). Migration: `attempts.audio_path`, and a
  `reviews` table (attempt, word index, teacher result, created_at).
- Word timings: Prisma gives none. Use the evidence model's forced alignment
  (`evidence/words.py`) when it is installed; otherwise an approximate span from pauses
  (`core/pauses.py`) and akshara counts, padded by 0.5 s and labelled approximate.
- Queue: words marked `check`/`unsure`, red words in otherwise strong readings, and
  `uncertain` placements. The teacher plays the clip and marks correct / misread / skipped.
- Overrides update the attempt's accuracy, the class view and the learner model (WP3).
- Done when: a teacher can clear a queue of 10 words in under 2 minutes, by keyboard too.

## WP6. The child's language (Oct 28 setup, Oct 30 wiring; text by Daniel, D1)

- All child-facing text moves to one strings file per language (kn, ta, hi, en). The child
  screens follow the reader's language; teacher screens stay English with a language switch.
- Spoken prompts: each child instruction has a Timbre clip ("Tap the mic and read"), since a
  Class 2 child may not read instructions. Clips cached; about 20 per language.
- **Daniel reviews Kannada and Tamil, Achindra reviews Hindi.** The strings file goes out on
  Oct 28 so review runs alongside WP3–WP5.
- Done when: a child can complete a reading without reading any English.

## WP7. Trust: reliability, consent, deletion (Oct 30, ½ day)

- "How reliable is this?" page in the app: what is caught and what is not, per language, with
  numbers generated from the saved results (same source as `scripts/check_numbers.py`, so
  they cannot drift), and the limits (synthetic voices, no human-rater agreement yet).
- Consent: adding a child needs a teacher-confirmed parent consent tick with a date (DPDP
  rules on children's data). No real names: aliases only, as now.
- Retention: recordings deleted after 30 days (setting); "delete this child's data" removes
  the child, attempts, audio, skill states and reviews.
- Done when: the delete is tested to leave no rows or files behind.

## WP8. NIPUN benchmark bands (Daniel builds D2, Claude wires it in Oct 30)

- Dashboard and profile show correct words per minute against grade bands from the
  Foundational Learning Study 2022 for each language (source cited on the page).
- Done when: each child shows "below / at / above" for their grade, with the number.

## WP9. Real conditions (Oct 31, 1 day)

- Offline recording: readings recorded with no connection are queued in the browser and
  uploaded when it returns (idempotent `request_id` already exists).
- Noise check before recording (level meter; a warning above a threshold).
- Light rewards (Daniel builds D3, Claude wires it in): a star per finished story, a streak of days read, praise in the child's
  language. No leaderboards.
- Done when: a reading made offline is scored after reconnecting, without a duplicate.

## WP10. Finish (Nov 1)

- Mock fixtures cover every new screen; Pages deploy dry run.
- Full end-to-end pass in a browser: new child → consent → placement → reading → practice →
  teacher review → profile → delete. Lighthouse and axe checks.
- README, WRITEUP, STATUS and ARCHITECTURE updated to the finished product.
- Done when: the end-to-end pass works in `live` and `mock`, and all checks are green.

## Optional, if decided

- **Evon practice stories** (needs the hosting decision): short stories that use the child's
  weak skills, strict JSON, validated against the curriculum, fallback to library passages.
- **Evidence check live for Hindi**: only if the model runs fast enough on the demo machine.
  The licence (CC BY-NC) is fine for the challenge, not for a commercial build.

## Who does what

**Achindra (with Claude)** builds the core and does all the wiring: Step 0, WP0–WP5, WP6
setup, WP7, WP9 offline queue and noise check, WP10. Achindra also checks the Hindi text,
runs the checkpoints, decides, posts and submits.

**Daniel (with his coding agent)** gets a light load: things only a Kannada/Tamil speaker
can do, plus three small frontend pieces in **new files only**, so his branches never
conflict with ours. Claude wires his pieces into the screens.

| # | Daniel's task | Size | When | Needs from us |
|---|---|---|---|---|
| D1 | Review the Kannada and Tamil child-screen text Claude drafted (`web/src/i18n/kn.json`, `ta.json`), fix what sounds wrong | 1 h | Oct 28–30 | done: drafts and loader merged Oct 27 |
| D2 | NIPUN bands: `web/src/lib/nipun.ts` + `web/src/components/BenchmarkBand.tsx`, with tests | 1–2 h | Oct 28–30 | nothing |
| D3 | Rewards: `web/src/state/rewards.ts` + `web/src/components/RewardsStrip.tsx`, with tests | 1–2 h | Oct 30–31 | nothing |
| D4 | Native test pass on his phone in Kannada and Tamil, issues filed on GitHub | 1 h | Nov 1 | the finished build |
| D5 | *Optional, after Nov 3:* render the held-out clips (`docs/HOLDOUT_HOWTO.md`) and the pending Kannada/Tamil script and skill-order reviews | — | if time | nothing |

### Brief for Daniel's agent (paste as is)

> Akshara repo, branch from `main`, one PR per task, CI green before merge
> (`cd web && npm run lint && npm run typecheck && npm test && npm run build`). Only create the
> files named below; do not edit existing screens or `src/api/*` — Achindra wires your pieces in.
> No emoji (icons are SVG in `components/icons.tsx`); colours and sizes only from
> `src/theme/theme.css`; native text gets `lang` via `scriptClass()`.
>
> **D1 `feat/i18n-kn-ta`.** `web/src/i18n/kn.json` and `ta.json` are complete first drafts.
> Review them as a native speaker following `web/src/i18n/REVIEW.md`: read every child screen
> in mock mode, fix wording that a 7-year-old would not say or hear in class, keep every
> `{placeholder}`. `npm test -- i18n` must pass. Mark the files reviewed in `REVIEW.md`.
>
> **D2 `feat/nipun-bands`.** `src/lib/nipun.ts` exports
> `nipunBand(lang: "kn-IN" | "ta-IN" | "hi-IN", grade: number, wcpm: number): { band: "below" | "at" | "above"; low: number; high: number } | null`
> (null when there is no benchmark for that grade). Take the oral reading fluency benchmarks
> for grades 2–3 per language from the Foundational Learning Study 2022 national report
> (air.org PDF) and cite the page in a comment. `components/BenchmarkBand.tsx` shows the band
> as a small labelled pill with the number and target range, readable without colour.
> Unit tests for every language and the edges.
>
> **D3 `feat/rewards`.** `src/state/rewards.ts` computes, from the reading history in
> `src/state/storage.ts` (read only): stars (one per finished story), the current streak of
> days with a reading, and the best streak. Pure functions, timezone-safe, tested.
> `components/RewardsStrip.tsx` shows stars and streak for a child, large and friendly,
> no leaderboard, no comparison with other children.

## Calendar

| Date | Achindra (with Claude) | Daniel |
|---|---|---|
| Oct 26 | Step 0, WP0; Achindra reads one sentence into the mic | |
| Oct 27 | WP1 | |
| Oct 28 | WP2, WP3; `en.json` + loader merged by noon | D1 starts; D2 |
| Oct 29 | WP4, WP5; **Checkpoint A**: Achindra uses it as teacher and child (30 min) | D1 continues |
| Oct 30 | WP6 wiring, WP7, WP8 wiring (D2); Achindra checks Hindi text and the reliability page | D1 done; D3 |
| Oct 31 | WP9 offline + noise check; rewards wiring (D3) | |
| Nov 1 | WP10; **Checkpoint B**: sign-off | D4 native test pass |
| Nov 2–3 | fixes; repo public, post | reshare the post |
| Nov 4–9 | fixes, optional items; submit by Nov 9 | D5 if time |

**Cut order if time runs short:** WP9 rewards, then WP9 offline, then WP8. Never cut WP5 or
WP7: they are what makes Akshara trustworthy.

## Decisions needed

1. Evon hosting (rented GPU or free notebook GPU), or drop Evon.
2. Daniel as teammate (Two-Person Army) or solo (Solo Ninja); this also decides who reviews
   Kannada and Tamil.
3. OK to merge `feat/learner` and PR #15 into `main` (Step 0).

## Out of scope before Nov 10

WhatsApp and phone reading, logins and multi-school accounts, a real pilot with children,
human-rater agreement study. These are the next steps after the challenge, and the write-up
says so.
