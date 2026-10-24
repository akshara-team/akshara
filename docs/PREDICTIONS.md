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
