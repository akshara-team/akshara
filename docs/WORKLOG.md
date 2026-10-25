# Work Log

Gnani evaluates and interviews each of us separately, so log what you did. Newest first. One line per piece of work is enough; link the PR or commit.

| Date | Who | What |
|---|---|---|
| 2026-10-21 | Daniel | Docs pass for handover: added [STATUS.md](STATUS.md) (done / next / owners), credited Daniel in the LICENSE and README team, replaced "Partner" with Daniel across the docs |
| 2026-10-21 | Daniel | Built the web app (`web/`): Vite + React + TS PWA with the child flow, teacher screens and six recovery states from the Figma handoff, on mock + live API adapters with per-screen error boundaries |
| 2026-10-21 | Daniel | Added the `web` CI job; fixed `check_numbers.py` filename drift so CI is green (92 Python + 27 web tests) |
| 2026-10-21 | Daniel | Phase 1 of the web MVP: `GET /v1/class/summary` wired into the teacher dashboard via a tested `toRoster` mapper, with the demo class as the fallback |
| 2026-10-21 | Daniel | Desktop layouts from the Figma desktop frames (roster table on the dashboard, 360/808, 320/848, 300/868, 340/560 workspaces) and moved every CSS value into `web/src/theme/theme.css` as a custom property |
| 2026-10-21 | Daniel | Desktop layouts for the child flow and recovery screens, derived from the teacher desktop language; one responsive shell (375 below 900px, 1280 above) for every route |
| 2026-10-21 | Daniel | Child home + saved progress: reader, language and reading history in `localStorage`, `/` redirects a returning child to `/home`, results are saved once and finish to home instead of role selection |
| 2026-10-21 | Daniel | Bundle-size budget (`web/scripts/budget.mjs`): CI fails past 120 kB JS / 160 kB total gzip; measured production build ~73 kB JS / ~78 kB total |
| 2026-10-21 | Daniel | `GET /v1/feedback/audio`: Timbre word audio with a content cache (verified live: one 1.20 s WAV, second request a cache hit, 1 paid call); Listen now plays model audio before the device fallback |
| 2026-10-21 | Daniel | Generated the Kannada + Tamil go/no-go clips with Timbre TTS (24 clips, mono 16 kHz) via `scripts/make_test_audio.py`, replacing hand recording; one clip fixed by re-rendering after a Cloudflare 403 |
| 2026-10-21 | Daniel | Ran the go/no-go test on the synthetic clips: Kannada 100% catch / 1% false-flag, Tamil 95% / 5% (loose) — both pass; result and decision written into GO_NO_GO.md |
| 2026-10-20 | Achindra | Open passages: fetched StoryWeaver catalogue descriptions, added deterministic mistake planting (skip, near-sound, distant, half-word) with tests, built 90 study passages (156 planted mistakes) |
| 2026-10-20 | Achindra | Restructured into core/providers/api, added service, SQLite store, FastAPI app, fixture provider, Dockerfile, CI format check and an eval regression gate |
| 2026-10-19 | Daniel | Wrote 20 Kannada + 20 Tamil go/no-go passages with planted errors (`data/go_no_go/passages.jsonl`); dry run passes 100% catch / 0% false flags. Drafted the frontend stack decision ([decisions/001-frontend-stack.md](decisions/001-frontend-stack.md)) and the FastAPI contract ([API_CONTRACT.md](API_CONTRACT.md)). Added `scripts/record.py` to record the clips |
| 2026-10-18 | Achindra | Set up the repo: docs, word-alignment scorer with tests, Prisma client, go/no-go script |
| 2026-10-17 | Achindra | Researched the challenge, competitors and Gnani models; picked the reading-tutor idea |

## 2026-10-20: honest-limits state
Service marks words accepted only via a spelling-variant rule as `check` (dashed ? in the screen) and returns a fixed notice with each attempt, because the chunked re-check failed to expose near-sound misreads. 92 tests pass.

## 2026-10-20: live check
scripts/live_check.py: real app plus Prisma, 3 clips x (clean, 8 kHz), 6 calls. Word marks identical in both conditions, no errors. Microphone path still untried.

## 2026-10-20: demo video
Built a 60 s silent demo from slides plus two real screenshots (app served offline from cached transcripts, WAV upload through a real browser). Timbre has no English voice, so no narration.

## 2026-10-20: docs refreshed
README status, PLAN outcome note, Gnani message drafts (docs/GNANI_MESSAGES.md).

## 2026-10-21: merged results and number check restored
Committed the open-set phone, noise, child-pitch and repeat/self-correction result files, which were missing from git, and pointed `scripts/check_numbers.py` back at them; a missing result file now fails the check instead of being skipped. GO_NO_GO.md shows the Hindi row from the Oct 19 run. Ledger merged from both machines (1,930 calls).

## 2026-10-22: story chunking (M6 phase 3)
`core/parts.py` splits passages into parts (whole sentences up to 12 words, cut only past 20, tiny parts joined). The API returns `parts` and accepts `part_index`, stored by migration 2 and scored against that part only. Web live mode reads the real parts. On the 90 open passages: 34 read in one part, 54 in two, 2 in three; parts are 4–20 words.

## 2026-10-22: accessibility pass (M6 phase 6)
Skip link, focus moved to each new screen's heading, `lang` on all native-script text, spoken word results on chips, a quiet recording timer. axe-core (dev only) runs on 12 routes in the web tests and found two real issues, both fixed: an unnamed progress bar and three unnamed avatar buttons. A theme contrast test checks the text pairs at 4.5:1. Not tested with a real screen reader.

## 2026-10-22: Pages deploy prepared (M6 phase 5)
No Pages workflow existed yet. Added `.github/workflows/pages.yml` (mock-mode build under `/akshara/`, 404.html fallback for deep links) and made the app base-path aware: router basename and logo from `BASE_URL`, relative manifest scope. Checked deep links, logo and navigation in a browser against a local Pages-like server. The job skips while the repo is private, since the free plan serves Pages only from public repos.

## 2026-10-24: product plan and phase 1 foundations
Wrote [PRODUCT_PLAN.md](PRODUCT_PLAN.md): the full plan with no real-user data, built on checking each word against the known text instead of trusting the transcript. Phase 1 started on branch `feat/script-tables`: script tables for all three languages (`core/script.py`), an akshara splitter (`core/aksharas.py`, lossless on all 7,977 passage words), a look-alike letter table from rendered glyphs in three fonts (`scripts/build_glyph_table.py`), eight new planted mistake types with a taxonomy of how each is scored, a 90-passage second set (156 mistakes), a 480-clip manifest with family-based splits (`data/bench/`), and a benchmark runner (`scripts/bench.py`). The dry run is perfect on all 480 clips; on committed transcripts the runner reproduces all 12 language-by-condition results in the open-set reports exactly. The old planter's output is unchanged. Waiting on: native review of `docs/review/SCRIPT_TABLES.md` (Daniel: Kannada, Tamil; Achindra: Hindi).

## 2026-10-24: phase 2, checking each word against the audio
Ran the per-word acoustic check (MMS, local CPU, no credits) on all 480 benchmark clips; every clip aligned. Fixed two bugs found on real audio: an int8 overflow in the alignment backtrace on long passages, and trailing separator frames squeezing the last word of every passage (31 of the 32 worst "correct" Hindi words). Added the `EvidenceSource` interface, timing features (silence and speech before each word), `evidence/scoring.py` and `scripts/evidence_report.py`. Verdict against the predictions: gross mistakes 96% (holds), pause location 14/15 (holds), near-sound 4/17 (fails the 50% bar). About half the subtle planted mistakes are probably not audible in the synthetic audio; on the audible ones the check beats Prisma in Hindi (20/22 vs 11/22) but not yet in Kannada or Tamil. Write-up: [RESULTS.md](RESULTS.md), [PREDICTIONS.md](PREDICTIONS.md). 182 tests pass.

## 2026-10-25: phase 3, deciding correct / not sure / error
Built `src/akshara/fusion.py`: a per-language logistic model on ten named features (fitted on `tune`), isotonic calibration and two thresholds (on `calibrate`), the agreement rule table, and accuracy bands with "needs a listen". `scripts/fusion_report.py` scores `test` only with `--test`. The predictions were committed (170adfb) before that one run. On `test`: fused false flags 3.0% vs Prisma 4.9%, mistakes not passed as correct 85% vs 76%, ECE 0.009. It missed both pre-set margins (1.9 points fewer false flags against 3 required; catch 3.6 points lower against 3 allowed), so the product keeps Prisma's marks. Hindi false flags rose (7.7% vs 2.8%). Kannada and Tamil fell by two thirds or more. No held-out engine exists yet. Also corrected the Phase 2 latency note (0.7 × real time, not slower than real time). Write-up: [RESULTS.md](RESULTS.md), [PREDICTIONS.md](PREDICTIONS.md).

## 2026-10-25: held-out engine prepared (for Daniel to render)
The manifest now lists 188 held-out clips: the 47 `test` passages read by AI4Bharat's Indic Parler-TTS, in four conditions, split `holdout`, never fitted on. Added `scripts/render_holdout.py` (runs in its own environment, because Parler-TTS pins an older `transformers`), a render list and passage file written by `build_manifest.py`, `--holdout` in `fusion_report.py`, and tests that keep the engine out of tuning and calibration. Moved `pieces()` into `akshara.dataset` so both render scripts share it. The held-out predictions and a decision rule are committed before any clip exists ([PREDICTIONS.md](PREDICTIONS.md)). Steps for Daniel: [HOLDOUT_HOWTO.md](HOLDOUT_HOWTO.md). The render script has not run against the real model yet; step 2 of the how-to is that check.
