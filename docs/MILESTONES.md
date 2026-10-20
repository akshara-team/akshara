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
- [ ] Phone 8 kHz, noise and child-proxy conditions
- [ ] Write-up in RESULTS.md with intervals; compare to the first study
- [x] Repeats and self-corrections: planting, scoring and a 30-passage set built; audio and transcription still to run

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

- [ ] 60 s demo video with before/after on the same clip
- [ ] Written explanation, models used, honest limits
- [ ] Caption drafts for LinkedIn and X (hashtags #GnaniAI #GreatIndianAIInternshipChallenge)
- [ ] Post live by about Nov 3
- [x] `docs/DECISIONS.md` (decision log)
- [x] Walkthrough per module ([WALKTHROUGH.md](WALKTHROUGH.md))
- [ ] Repo made public

## M5. Submit (by Nov 9)

- [ ] Every number in the docs regenerates from cached results
- [ ] Final check of repo, commits and docs for stray tool names
- [ ] Submission form filled with post link
- [ ] Submitted before Nov 10, 11:59 PM IST

## Stretch

- [ ] Second opinion from an open acoustic model (only if there is slack)
- [ ] Ask Gnani on Discord about open read-speech datasets
- [ ] Report the Cloudflare 403 on one clip to Gnani
