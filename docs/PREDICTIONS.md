# Predictions, written before the run

## Halting-audio test (written Oct 20, before any halting clip exists)

Setup: 45 open passages (15 per language) that contain a near-sound or distant swap. Each is read in chunks of 3 words, synthesised separately and joined with 0.35 s of silence, like a halting reader. The same audio is transcribed two ways: **whole** (one Prisma call per clip) and **chunked** (cut at pauses found in the audio, one call per piece, transcripts joined). Both are scored against the same planted mistakes.

1. Near-sound swaps are caught more often chunked than whole, by at least 10 percentage points.
2. Distant swaps and skips change little (within 5 points).
3. The chunked pass raises the false-flag rate, but by no more than 3 points over whole.
4. Chunking is **not** a clear win in Tamil, where short fragments may be recognised less reliably.

If 1 fails, we report that chunking does not help and why. If 3 fails, the mitigation costs too much accuracy and we say so. Numbers will be reported with intervals, and the sample (about 20 near-sound swaps per condition) is small enough that a 10-point difference may not be statistically reliable. We will say that too.

### Addendum, written Oct 20 before the halting run
The isolated-word control (`scripts/isolated_control.py`) found that Prisma returns the original word for 18 of 39 near-sound non-words even with no sentence around them, and the read non-word for only 4. So sentence context is not the only cause, and prediction 1 may fall short. We cannot tell whether the voice or the transcriber is responsible. Predictions 1 to 4 stand as written and will be judged as written.

## Phase 2: checking each word against the audio (written Oct 24, before any model is run)

Setup, fixed before the run:
- **Model:** `facebook/mms-1b-all` with the Hindi, Kannada and Tamil adapters. It is a CTC model that writes each language's own script letter by letter, with no language model, so it has no built-in pull towards real words.
- **Alignment:** CTC forced alignment of the story text to the audio gives each word a start and end.
- **Per-word check:** for each word's segment (its aligned span plus 2 frames each side), score log P(story word) against (a) the best alternative from the script tables (close sounds, look-alikes, vowel length, vowel signs, conjunct read apart) and (b) the model's own best free reading of the segment. The score is the smaller of the two margins, per frame.
- **Threshold:** per language, the strictest threshold that keeps false flags on correctly read words at or under 5% on the `tune` split. Results are reported on `calibrate` + `test` pooled (the per-condition test split alone is too small), with intervals. Phase 3 will refit on `calibrate` and report on `test` only.
- **Audio:** clean open set and second set first; then the phone, noise and child-pitch conditions.

Predictions:
1. **Audibility.** Where Prisma wrote the story word for a planted near-sound change, the acoustic model's free reading shows the changed letter in at least 30% of those words. If it is under 10%, the synthetic voice probably did not pronounce the change, and near-sound misses say little about Prisma.
2. **Near-sound catch** by the per-word check alone, at 5% false flags: at least 50% on clean audio (Prisma alone: 8 of 39, 21%).
3. **Look-alike letter, vowel sign and conjunct** mistakes: at least 60% each. **Vowel length:** at most 40%, the weakest type.
4. **Gross mistakes** (skip, distant, half, first-akshara guess, reversal): at least 85% by the check alone. Prisma already catches most of these, so this mainly tests that the check is sane.
5. **Either flags** (Prisma or the check): near-sound at least 55%, with false flags at most 8%.
6. **Phone audio (8 kHz):** near-sound catch drops by at least 15 points from clean, since aspiration cues sit in the frequencies a phone line cuts.
7. **Alignment.** In at least 13 of the 15 clips with a planted long pause, the longest gap between aligned words sits right before the paused word.
8. **Tamil** is the weakest language for the check.

If 2 fails, the per-word check does not rescue near-sound detection on this audio; we will report that and look at prediction 1 to see whether the voice is the cause. If 5's false-flag bound fails, the check costs too much accuracy to combine naively, and Phase 3 has to earn it.

### Verdict, written Oct 24 after the run

Two runs, both on all 480 clips (`results/evidence_report_run1.json`, `results/evidence_report.json`). Run 1 had an alignment bug: the model writes its word separator over the silence at the end of a clip, and the aligner did not accept a separator there, so the last word of every passage was stretched over that silence and scored as misread. Those last words were 31 of the 32 worst-scoring correct words in the Hindi `tune` split, and they set the Hindi threshold at −1.25 instead of −0.16. The fix (separators count as silence, `evidence/words.py`) was found from the `tune` split. Both runs are reported. Run 1's results on `calibrate` + `test` had already been seen when the fix went in, so run 2's numbers there are not blind. Phase 3 reports on `test` only.

| # | Prediction | Run 1 | Run 2 (fixed) | Verdict |
|---|---|---|---|---|
| 1 | Model hears ≥ 30% of near-sound swaps that Prisma hid | 10/31, 32% | same (no threshold involved) | **Holds**, barely (interval 19–50%) |
| 2 | Near-sound catch ≥ 50% on clean audio | 2/17, 12% | 4/17, 24% (10–47%) | **Fails** |
| 3 | Look-alike, vowel sign, conjunct ≥ 60% each; vowel length ≤ 40% | 67%, 20%, 0%; 0% | 6/9 67%, 2/5 40%, 1/6 17%; 1/12 8% | **Fails** for vowel sign and conjunct; holds for look-alikes and vowel length |
| 4 | Gross mistakes ≥ 85% | 65/70, 93% | 67/70, 96% | **Holds** |
| 5 | Either source: near-sound ≥ 55%, false flags ≤ 8% | 18%, 11% | 4/17 24%, 146/1307 11% | **Fails** on both |
| 6 | Phone audio drops near-sound catch by ≥ 15 points | 12% → 6% | 24% → 18%, 6 points | **Fails**, but the clean rate is too low to drop 15 points |
| 7 | Longest gap before the paused word in ≥ 13 of 15 clips | 15/15 | 14/15 | **Holds** |
| 8 | Tamil is the weakest language | yes | Tamil 57%, Kannada 65%, Hindi 87% | **Holds** |

Prediction 2 failed, so, as written above, we looked at prediction 1. It held, but only just: of 123 subtle planted mistakes in clean audio (all splits), the model's own free reading shows the change for 62 and shows the original word for 61. **About half of the subtle mistakes are probably not in the audio at all**, and no detector can catch those. On the 62 that are audible, the check catches 35 and Prisma 30. In Hindi the check catches 20 of 22, against 11 for Prisma. In Kannada (9 of 21) and Tamil (6 of 19) it does worse than Prisma (11 and 8), because long, correctly read words also score low there, which pushes the threshold down. This breakdown was made after the run and is not a test of any prediction. "Audible" is judged by the same model the check uses, so the check's rate on audible words is flattering. Prisma's rate on the same words is the fair comparison.

## Phase 3: fusion into three states (written Oct 25, before the `test` split is scored)

Setup, fixed before the run (`scripts/fusion_report.py`, `src/akshara/fusion.py`):
- **Inputs per word:** Prisma's mark (loose and strict spelling) and the per-word check's margins against the listed misreadings and against the free reading. Ten named features, listed in `fusion.FEATURES`, including two agreement terms (Prisma flag × check margin).
- **Model:** L2-regularised logistic regression (penalty 1.0, standardised features), one per language, fitted on `tune` across all audio conditions. Isotonic calibration and both thresholds fitted per language on `calibrate`. `error` is set so that at most 5% of correct words are marked `error`. `correct` is then set as low as possible while at most 10% of words are `unsure`.
- **Baseline rules:** the agreement table (both doubt: `error`, one: `unsure`, neither: `correct`), with the Phase 2 check threshold.
- **Passages:** reading-accuracy bands (Betts: below 90% frustration, 90–95% instructional, 95% and up independent). An `unsure` word is counted both ways. If the interval crosses a band line, the attempt is "needs a listen".
- **Reported:** `test` only, all four audio conditions pooled unless stated, with 95% intervals. Everything frozen. One run.
- **What we already saw:** Prisma alone and the check alone on `test` (Phase 2 pooled `calibrate` + `test`), and all four systems on `calibrate` while building this. Those `calibrate` numbers set the expectations below, so the predictions are informed, not guesses. `calibrate` itself is not reported as a result.
- **No held-out engine exists.** All clips are Timbre v3.0, so the plan's exit check ("met on the held-out engine") cannot be run yet. These predictions are for `test`, which is the same engine with unseen passages.

Predictions on `test`:
1. **False flags:** fused ≤ 5% pooled, and lower than Prisma alone by at least 3 points.
2. **No loss of catch:** fused `error` catch within 3 points of Prisma alone or better. Gross mistakes ≥ 90%.
3. **Not sure:** ≤ 10% of words are `unsure`.
4. **Mistakes passed as correct:** fused `error` + `unsure` covers ≥ 78% of planted mistakes.
5. **Near-sound catch ≥ 60%** (plan target): **fails**. We expect ≤ 30% as `error`.
6. **Calibration:** ECE ≤ 0.05 for the fused probability.
7. **Agreement rule vs fused:** the rule table gives fewer false flags (≤ 3%) but more `unsure` than fused, and its `unsure` exceeds 8%.
8. **Bands:** misplaced (among attempts not sent for a listen) ≤ 5%: **fails**. We expect 15–35%, because most passages hold about two mistakes in 15–20 words, which sits near the 90% line, and about half the subtle mistakes are probably not in the audio. "Needs a listen" goes to 25–50% of attempts.
9. **Latency** ≤ 4 s for a 20 s part on CPU: **fails**. The Phase 2 run measured 0.69 × real time on this laptop (about 14 s per 20 s), including model loading.

If 1 or 2 fails, fusion does not earn its place over Prisma alone and the product keeps the two-state Prisma marks. If 6 fails, the probabilities are not shown to teachers as numbers.

### Verdict, written Oct 25 after the one `test` run

`results/fusion_report.json`. Test split, all four audio conditions pooled: 139 planted mistakes, 1,351 correct words.

| # | Prediction | Result | Verdict |
|---|---|---|---|
| 1 | Fused false flags ≤ 5%, and ≥ 3 points below Prisma | 40/1351 (3.0%) vs Prisma 66/1351 (4.9%): 1.9 points lower | **Fails** on the margin |
| 2 | Fused catch within 3 points of Prisma; gross ≥ 90% | 100/139 (72%) vs 105/139 (76%): 3.6 points lower; gross 90/98 (92%) | **Fails** on catch, narrowly; gross holds |
| 3 | `unsure` ≤ 10% of words | 107/1490 (7.2%) | **Holds** |
| 4 | `error` + `unsure` ≥ 78% of mistakes | 118/139 (85%) | **Holds** |
| 5 | Near-sound ≥ 60% fails; ≤ 30% as `error` | 5/24 (21%) as `error`, 14/24 not passed as correct | **Holds** (the target fails, as predicted) |
| 6 | ECE ≤ 0.05 | 0.009 | **Holds** |
| 7 | Rule table: false flags ≤ 3%, more `unsure` than fused, above 8% | 19/1351 (1.4%); 129/1490 (8.7%) vs 7.2% | **Holds** |
| 8 | Band misplacement ≤ 5% fails; 15–35% misplaced, 25–50% need a listen | 11/60 (18%) misplaced, 40/100 need a listen | **Holds** (the target fails, as predicted) |
| 9 | Latency ≤ 4 s per 20 s part on CPU fails | about 14 s | **Holds** (the target fails, as predicted) |

Predictions 1 and 2 failed, so, as written, **the fused decider does not replace Prisma's marks in the product yet.** Fusion did what it was meant to do in direction: fewer false flags (3.0% vs 4.9%), and fewer mistakes passed as correct (21 vs 34 of 139, because doubtful words go to `unsure`). But it did not meet the margins we set. Prisma's false-flag rate on `test` (4.9%) was lower than on `tune` and `calibrate` (9%), which left less room to improve.

Seen after the run, not tests of any prediction:
- **Hindi went the wrong way.** Fused false flags were 25/323 (7.7%) against Prisma's 9/323 (2.8%). The `calibrate` threshold did not carry over to `test` in Hindi. In Kannada (7/636 vs 25/636) and Tamil (8/392 vs 32/392), fusion cut false flags by two thirds or more.
- **The agreement rule table** had false flags 19/1351 (1.4%, 3.5 points below Prisma) and catch 101/139 (73%, 2.9 points below), so it would have passed both margins. We chose the logistic model as the primary decider before the run, so this does not count. A held-out set should test the rule table as a pre-registered system.
- Plan change 2 (margins per changed letter) did not help. On `tune`, the summed margins separated subtle mistakes from correct words no better than per-frame margins (AUC 0.91 vs 0.94 Hindi, 0.91 vs 0.91 Kannada, 0.77 vs 0.78 Tamil), so the fused model uses per-frame margins.
- Plan change 1 (count only audible mistakes) cannot be done with Prisma as the "second model". Prisma wrote the planted non-word for only 6 of 41 subtle mistakes on `test`, so it confirms almost nothing. An independent second acoustic model is needed.

## Held-out engine (written Oct 25, before any held-out clip is rendered)

Setup, fixed before the run:
- **Audio:** the 47 `test` passages read again by AI4Bharat's Indic Parler-TTS (`scripts/render_holdout.py`), in the same four conditions (clean, phone 8 kHz, noise 5 dB, child pitch): 188 clips, split `holdout`. Voices: Rohit and Divya (Hindi), Suresh and Anu (Kannada), Jaya (Tamil).
- **Systems:** exactly as frozen for Phase 3: same fitted models, calibration and thresholds, all from Timbre clips. Nothing is refitted. Both the fused model and the agreement rule table are primary systems this time.
- **Exclusions, fixed now:** a clip is dropped only if MMS cannot align it, or if Prisma returns no transcript for it. Clips flagged "unusual length" by the render script are kept. Every exclusion is counted in the report.
- **Reported:** `results/fusion_report_holdout.json`, all four conditions pooled, with 95% intervals. One run.

Predictions on the held-out engine:
1. **Prisma is worse on a voice that is not Gnani's own:** its false-flag rate is at least 2 points higher than on `test` (4.9%).
2. **The thresholds partly carry over:** fused false flags ≤ 7%, and agreement-rule false flags ≤ 4%.
3. **Mistakes passed as correct:** fused `error` + `unsure` ≥ 75% of planted mistakes.
4. **Calibration loosens:** fused ECE ≤ 0.08.
5. **Agreement rule against Prisma:** false flags at least 3 points lower and catch within 3 points. This is the Phase 3 margin.
6. **Fused against Prisma:** the same margin, and we expect it to **fail** again, as on `test`.

Decision rule, fixed now: if the agreement rule meets prediction 5, the product uses its three states (`unsure` goes to the teacher's listen queue). If neither system meets the margin, the product keeps Prisma's marks and the per-word check stays a research result.
