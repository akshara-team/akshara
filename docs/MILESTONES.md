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
- [ ] Audio generated for all 90 passages
- [ ] Base condition transcribed and scored, per-type catch table
- [ ] Phone 8 kHz, noise and child-proxy conditions
- [ ] Write-up in RESULTS.md with intervals; compare to the first study
- [ ] Repeats and self-corrections added

## M2. Mitigation (Oct 23–27)

- [ ] Prediction written down before running
- [ ] Pause finder on the audio (no word timings from Prisma)
- [ ] Chunked re-check pass behind the provider interface
- [ ] Catch and false-flag rates compared with the whole-sentence pass on the same clips
- [ ] Result recorded whether it helps or not

## M3. Product (Oct 27–Nov 1)

- [ ] "Check this word" state in the service
- [ ] Browser reading screen: mic, green / red / uncertain words
- [ ] Per-attempt trace view
- [ ] Class summary view
- [ ] Runs end to end on live Prisma and Timbre, including 8 kHz mode
- [ ] First usable version (v0.1) tagged

## M4. Demo and docs (Nov 1–3 for the post, then polish)

- [ ] 60 s demo video with before/after on the same clip
- [ ] Written explanation, models used, honest limits
- [ ] Caption drafts for LinkedIn and X (hashtags #GnaniAI #GreatIndianAIInternshipChallenge)
- [ ] Post live by about Nov 3
- [ ] Walkthrough per module and `docs/DECISIONS.md`
- [ ] Repo made public

## M5. Submit (by Nov 9)

- [ ] Every number in the docs regenerates from cached results
- [ ] No Claude mentions in repo, commits or docs
- [ ] Submission form filled with post link
- [ ] Submitted before Nov 10, 11:59 PM IST

## Stretch

- [ ] Second opinion from an open acoustic model (only if there is slack)
- [ ] Ask Gnani on Discord about open read-speech datasets
- [ ] Report the Cloudflare 403 on one clip to Gnani
