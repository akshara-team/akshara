# Results

Prisma v2.5 on planted reading mistakes. Generated from `results/go_no_go_*.json`; rerun with `scripts/go_no_go.py --variant <name>`.

## Setup

- 36 short passages (12 per language: Hindi, Kannada, Tamil). Each has 2 planted mistakes (one skipped word, one word swapped for a similar-sounding one), except 2 clean passages per language.
- Audio is **synthetic**: Timbre v3.0 reads the text *with* the mistakes in it, a different voice per clip. No bias list is sent to Prisma, and `format=verbatim` is used.
- **Catch** = planted mistakes flagged ÷ planted mistakes (20 per language). **False flag** = correct words flagged ÷ correct words (73–117 per language).
- **Strict** compares words exactly. **Loose** also treats harmless spelling variants as equal (Hindi: nukta, chandrabindu/anusvara, वह/वो; Tamil: trailing joining consonant). Kannada has no loose rules.
- Variants are simulated, not recorded: 8 kHz phone band with mu-law; pink noise at 15 and 5 dB SNR; pitch up 4 semitones (rough child proxy); that plus phone; Timbre at speed 0.85.

## Catch rate and false-flag rate (strict → loose)

| Audio | Hindi catch | Hindi false flag | Kannada catch | Kannada false flag | Tamil catch | Tamil false flag |
|---|---|---|---|---|---|---|
| base | 95% | 5% → 1% | 100% | 1% | 95% | 7% → 1% |
| phone 8 kHz | 95% | 6% → 1% | 100% | 1% | 95% | 7% → 1% |
| noise 15 dB | 95% | 7% → 1% | 100% | 1% | 95% | 7% → 1% |
| noise 5 dB | 95% | 6% → 1% | 100% | 4% | 95% | 12% → 7% |
| child proxy | 95% | 8% → 2% | 100% | 1% | 95% | 7% → 1% |
| child proxy + phone | 95% | 9% → 3% | 95% | 0% | 95% | 10% → 4% |
| slow speech | 95% | 6% → 0% | 100% | 3% | 95% | 11% → 5% |

Our pass line was catch ≥ 70% and false flag ≤ 10%. Every condition passes in loose mode. Strict fails only for Tamil at 5 dB noise (12%) and with slow speech (11%).

## Findings

1. **Prisma transcribes what was said, with one exception.** 38 of 40 planted mistakes were caught in every condition.
2. **Context autocorrection is the failure mode.** Two swaps were silently corrected to the word the sentence predicts, in all 7 conditions: खेल → खेत ("the farmer sows wheat in the field") and மலை → மழை ("the rain is falling"). A wrong word that still fits the context can be hidden. Swaps that don't fit the context were caught.
3. **Most false flags are spelling variants, not misreadings.** The loose rules remove most of them without hiding any planted mistake. They do not remove real one-letter recognition slips (for example Kannada vowel length, or Tamil சொன்னாள் → சொன்னால்).
4. **Noise at 5 dB is where it starts to bend**, mostly in Tamil.

## Limits, stated plainly

- **Not validated on children or on real classroom audio.** Every clip is a text-to-speech voice, some degraded by code. A pitch shift is a crude stand-in for a child's voice.
- **Small sample.** 20 planted mistakes per language: the 95% interval on a 95% catch rate is roughly 76–99%. The seven conditions reuse the same clips, so they are not independent tests and should not be pooled.
- **Planted mistakes are of our design** (similar-sounding swaps and skips). Real children make other errors, such as half-said words and long pauses.
- **Passages were written by us, not reviewed by a native speaker.** They are a pipeline test, not teaching material.

## Context-autocorrection experiment

The base run missed the same two swaps in every condition, both corrected to the word the sentence predicts. To test whether context is the cause, we built 30 sentence frames (10 per language), each with one strongly predicted word, and read each three ways with the same voice: correctly (control), with a near-identical sound swapped in (**near sound**, e.g. दूध → दूर), and with a distant, equally wrong word swapped in (**distant**, e.g. दूध → किताब). Prediction written before the run: near-sound swaps are caught less often than distant ones. Run with `scripts/build_context_passages.py`, `scripts/go_no_go.py --passages data/go_no_go/passages.context.jsonl --variant context` and `scripts/context_analysis.py`.

| Swap | Hindi | Kannada | Tamil | All |
|---|---|---|---|---|
| Near sound | 8/10 | 9/10 | 8/9 | **25/29 (86%)**, interval 69–95% |
| Distant | 10/10 | 10/10 | 9/9 | **29/29 (100%)**, interval 88–100% |

- All 4 misses are near-sound swaps, and each was silently corrected to the contextually expected word (दूर → दूध, बढ़ते → पढ़ते, ಅಣ್ಣ → ಅನ್ನ, கடை → கதை). No distant swap was missed.
- The direction matches the prediction, but **the difference is not statistically conclusive** (4 vs 0 misses, Fisher exact two-sided p = 0.11, 29 swaps per condition). Read it as suggestive evidence that autocorrection depends on both acoustic closeness and context, not as proof.
- The control (sentences read correctly) had 4 false flags in about 132 words in strict mode and 2 in loose mode.
- One clip (`ta-x01-m`) was blocked by Cloudflare with an HTTP 403 HTML page on every attempt, while the same sentence's other clips went through. It looks like a false positive on that file's bytes. It is excluded, and so is its frame from the comparison (29 near-sound pairs, not 30).

Extra limits for this experiment: the sentences and swaps were written by us and have not been reviewed by a native speaker, so some "near sound" swaps may be less close than intended, and the sentence frames are simple present-tense sentences, which are the easiest case for a language model to predict.

## Open-passage study (StoryWeaver descriptions, base condition)

90 passages (30 per language) from the descriptions of StoryWeaver books, with 156 planted mistakes of four kinds. Same voices-per-passage method as above, no bias list, verbatim format. Run: `scripts/build_open_passages.py`, `scripts/make_test_audio.py --passages data/open_passages/passages.jsonl --out-dir data/open_passages/audio`, `scripts/go_no_go.py --passages data/open_passages/passages.jsonl --variant open_base --audio-dir data/open_passages/audio`. 87 of 90 clips were transcribed; 3 were blocked by Cloudflare with an HTTP 403 page on every attempt and are excluded.

Caught / planted, loose scoring:

| Mistake | Hindi | Kannada | Tamil | All |
|---|---|---|---|---|
| Skipped word | 12/13 | 14/14 | 14/14 | 40/41 |
| Distant swap | 12/12 | 12/12 | 12/12 | 36/36 |
| Half-read word | 10/12 | 10/11 | 8/11 | 28/34 |
| Near-sound consonant | 4/13 | 1/13 | 3/13 | **8/39 (21%)** |

False flags on correct words (strict → loose): Hindi 7% → 3%, Kannada 12% → 8%, Tamil 15% → 9%. Hindi and Tamil strict fail our 10% line; loose passes in all three. The loose rules added for this run: Hindi nasal conjuncts and final यी/ये; Kannada word-final vowel length. Most false flags are spelling differences between the book text and the transcript (ನೀವೂ/ನೀವು, लम्बे/लंबे, गयी/गई), not misreadings.

### What this does and does not show

- Skips and unrelated word swaps are caught almost every time, in all three languages.
- **Near-sound consonant changes are mostly not flagged: 8 of 39.** In the first study, near-sound *real-word* swaps were caught 86% of the time. Here the changed words are mostly **non-words**, and the transcriber usually writes the real word instead.
- **We cannot say who corrects the word.** The control (`scripts/isolated_control.py`) synthesised each planted word alone: only 4 of 39 came back as the non-word we asked for, 18 came back as the original word and 17 as something else. With no sentence around it, there is still no reliable way to tell whether the voice never pronounced the non-word or the transcriber replaced it. So context alone does not explain the misses.
- A discarded first design is described in [DECISIONS.md](DECISIONS.md); its numbers are not reported.

Extra limits: the planted words are our design and may not match real children's errors; descriptions are blurbs, not story text; the 87-clip sample gives wide intervals (8 of 39 is 21%, interval about 11–36%).

## Open passages under degraded audio, and repeats and self-corrections

Same 90 passages and planted mistakes as the base run, with the clips degraded by code (`scripts/make_variants.py data/open_passages/audio data/open_passages/variants`): 8 kHz phone band, pink noise at 5 dB signal-to-noise, and pitch raised 4 semitones as a rough child stand-in. Loose scoring, pooled over the three languages, caught / planted:

| Planted mistake | Base (87 clips) | Phone 8 kHz | Noise 5 dB | Child pitch +4 |
|---|---|---|---|---|
| Skipped word | 40/41 | 41/42 | 40/42 | 41/42 |
| Unrelated word | 36/36 | 39/39 | 39/39 | 39/39 |
| First half of a word | 28/34 | 30/36 | 27/36 | 30/36 |
| One consonant changed | 8/39 | 7/39 | 6/39 | 5/39 |
| False flags on correct words | 84/1221 (6.9%) | 86/1263 (6.8%) | 110/1263 (8.7%) | 102/1263 (8.1%) |

All 90 clips of each degraded condition were transcribed (no Cloudflare blocks this time; the base run lost 3). Compared with the first, smaller study (36 clips, catch 95–100% in every condition), skips and unrelated words hold up on the larger set; the new, harder mistake types (a changed consonant, half a word) are where the catch rate drops, and that is the same in every audio condition. Degraded audio does not rescue or hide those mistakes. Noise and child pitch add about 1–2 points of false flags. These are synthetic voices degraded by code, not real phones, classrooms or children.

**Repeats and self-corrections** (30 passages, one repeat or one self-correction each; `scripts/go_no_go.py --passages data/open_passages/disfluency.jsonl --variant open_disfluency --audio-dir data/open_passages/disfluency_audio`). With `format=verbatim` the transcript kept the extra word in 12 of 14 repeats and 14 of 15 self-corrections (29 of 30 clips transcribed; `sw-675080-d` was blocked). So the app can show that a child hesitated or restarted, not only whether the final word was right. False flags on the other words were 6% (Hindi), 4% (Kannada), 9% (Tamil).

## Halting-audio test: does a chunked re-check help?

Predictions were committed before the run ([PREDICTIONS.md](PREDICTIONS.md)). Setup: 45 open passages containing a near-sound or distant swap, read in 3-word chunks (each synthesised separately, joined with 0.35 s of silence). The same audio was transcribed **whole** (one call per clip) and **chunked** (cut at pauses found in the audio, one call per piece). 43 of 45 clips completed; 2 were blocked by a Cloudflare 403 and are listed in `results/halting_study.json`. Run: `scripts/make_halting_audio.py`, `scripts/halting_study.py`.

Loose scoring, all three languages pooled:

| | Whole clip | Chunked | Change |
|---|---|---|---|
| Near-sound consonant caught | 10/32 (31%, interval 17–49%) | 9/32 (28%, 15–46%) | 1 fewer |
| Distant swap, skip | 18/18, 19/19 | 18/18, 19/19 | none |
| False flags on correct words | 44/554 (7.9%, 6–11%) | 60/554 (10.8%, 8–14%) | +2.9 points |

Near-sound swaps caught by one pass only: chunked only 2, whole only 3 (sign test p = 1.00). Hindi false flags rose from 5% to 11%; Kannada 5% to 7%; Tamil 14% to 15%. The pause finder found the expected number of pieces in 26 of 43 clips (60%). On only those 26 clips the picture is the same (post-hoc subset): near-sound caught 7/17 whole against 5/17 chunked.

### Verdict against the predictions

1. Near-sound swaps caught at least 10 points more often chunked: **failed**. There was no gain (28% vs 31%).
2. Distant swaps and skips change little: **held** (unchanged, 100% in both).
3. False flags rise by no more than 3 points: **held pooled** (+2.9) **but not for Hindi** (+6).
4. Not a clear win in Tamil: **held** (and not a win anywhere).

**Chunking does not recover near-sound mistakes in this data.** Together with the isolated-word control, which found the transcriber often returns the real word even with no sentence at all, this points away from sentence context as the main cause. Alternatives we could not separate: the transcriber's preference for real words, or the synthetic voice not pronouncing the non-word. Limits: 32 near-sound items per condition, so a real difference of 10 points or less could not be seen; the pause finder missed the piece count in 40% of clips; all audio is synthetic.

## Checking each word against the audio (Phase 2)

Generated from `results/evidence_report.json`; rerun with `scripts/evidence_study.py` (local model, no credits) and then `scripts/evidence_report.py`. Predictions and verdict: [PREDICTIONS.md](PREDICTIONS.md).

**What it is.** An open speech model (`facebook/mms-1b-all`, which writes letters with no word list behind it) gives frame-by-frame letter probabilities. The story text is aligned to the audio, so every word gets a start and end time. Then each word's frames are scored against the story word, against its likely misreadings from the script tables, and against the model's own free reading. A word is flagged when its score falls below a per-language threshold, set from correctly read words in the `tune` split so that 5% of them are flagged. The same threshold is used in every audio condition.

**Setup.** 480 benchmark clips: the 90 open passages in 4 conditions, the 90-passage second set (eight new mistake types), and 30 repeat and self-correction clips. Numbers are on the `calibrate` + `test` splits pooled, with 95% intervals. All 480 clips aligned.

### Clean audio: Prisma alone, the check alone, and either

| Language | Prisma catch | Prisma false flags | Check catch | Check false flags | Either catch | Either false flags |
|---|---|---|---|---|---|---|
| Hindi | 24/30 (80%) | 19/416 (5%) | 26/30 (87%) | 28/416 (7%) | 26/30 (87%) | 41/416 (10%) |
| Kannada | 33/49 (67%) | 27/470 (6%) | 32/49 (65%) | 29/470 (6%) | 35/49 (71%) | 51/470 (11%) |
| Tamil | 26/40 (65%) | 38/421 (9%) | 23/40 (57%) | 24/421 (6%) | 27/40 (68%) | 54/421 (13%) |
| All | 83/119 (70%) | 84/1307 (6%) | 81/119 (68%) | 81/1307 (6%) | 88/119 (74%) | 146/1307 (11%) |

By type (all languages, clean): the check catches skipped and distant words 20/20 each and gross mistakes 67/70 overall. Subtle mistakes stay hard: near-sound 4/17, look-alike letter 6/9, vowel sign 2/5, conjunct 1/6, vowel length 1/12. Under phone, noise and child-pitch audio the check keeps its false flags at 5–6% while Prisma's rise to 6–10%. Their catch rates are close: 51–54 of 72 each.

### Why subtle mistakes stay hard

Of 123 subtle planted mistakes in clean audio (all splits), the model's free reading shows the change for 62 and the original word for 61. **About half the subtle mistakes were probably never pronounced by the synthetic voice**, which fits the isolated-word control, where Prisma returned the original word for 18 of 39 near-sound swaps even with no sentence around them. Every detector is capped by that, including Prisma. On the 62 audible ones:

| | Hindi | Kannada | Tamil | All |
|---|---|---|---|---|
| Check | 20/22 | 9/21 | 6/19 | 35/62 |
| Prisma | 11/22 | 11/21 | 8/19 | 30/62 |

The check works in Hindi. In Kannada and Tamil it loses to Prisma, because correctly read long words also score low. Agglutinated words, joining consonants and a free reading that runs into the next word all spread the scores of correct words, and that pushes the threshold down. This breakdown was made after the run, and "audible" is judged by the same model, so read the check's row as an upper bound.

### Timing from the alignment

The longest gap in the clip sits right before the paused word in 14 of 15 clips with a planted long pause. Two timing flags, with thresholds again set from plain words in `tune` at 5%:

| Flag | Long pause | Sounded out | Repeat | Self-correction | False flags |
|---|---|---|---|---|---|
| Silence before the word ≥ ~0.5 s | 7/7 | 3/8 | 2/6 | 1/6 | 65/1244 (5%) |
| Speech before the word not in the story | 0/7 | 4/8 | 4/6 | 2/6 | 37/1244 (3%) |

Prisma's text cannot show a pause at all, and this finds every one. Sounding out, repeats and self-corrections are only partly caught. Phase 3 will combine these two flags with Prisma's inserted words.

### Limits

- **Small samples.** Only 17 near-sound swaps in the pooled split, so a single word moves the rate by 6 points.
- **The fix was not blind.** The alignment fix came after run 1's pooled results had been seen (see the verdict in PREDICTIONS.md).
- **Too slow for live use yet.** The model is a 1-billion-parameter model on CPU, about 5.7 s per clip on this laptop (clips average 8.2 s), so about 0.7 × real time including model loading: about 14 s for a 20 s part. The plan's target of 4 s after a 20 s part needs a GPU or a smaller model.
- **Non-commercial licence.** MMS is CC BY-NC 4.0 (see DECISIONS.md).
- **Synthetic voices only.** Every clip is still synthetic, so none of this has been measured on children.

## Deciding: correct, not sure, or error (Phase 3)

Generated from `results/fusion_report.json`; rerun with `scripts/fusion_report.py --test` (no credits). Predictions and verdict: [PREDICTIONS.md](PREDICTIONS.md). Code: `src/akshara/fusion.py`.

**What it is.** Each word gets one of three states. Two deciders:
- **Agreement rule table.** Prisma and the per-word check both doubt the word: `error`. One of them: `unsure`. Neither: `correct`.
- **Fused model.** A small logistic model per language on ten named features (Prisma's mark, the check's margins, two agreement terms), so every decision can be explained word by word. It is fitted on `tune`, turned into a probability by isotonic calibration on `calibrate`, and cut by two thresholds set on `calibrate`: at most 5% of correct words `error`, at most 10% of all words `unsure`.

`unsure` words are not marked wrong to the child. They go to the teacher's listen queue.

**Setup.** `test` split only (101 clips; 139 planted mistakes and 1,351 correct words, all four audio conditions pooled), scored once with everything frozen, after the predictions were committed.

| System | Caught as `error` | Not passed as correct (`error` or `unsure`) | False flags | `unsure` |
|---|---|---|---|---|
| Prisma alone | 105/139 (76%) | 105/139 (76%) | 66/1351 (4.9%) | 0 |
| Agreement rule | 101/139 (73%) | 113/139 (81%) | 19/1351 (1.4%) | 129/1490 (8.7%) |
| Fused model | 100/139 (72%) | 118/139 (85%) | 40/1351 (3.0%) | 107/1490 (7.2%) |

By language, false flags (fused vs Prisma): Hindi 25/323 vs 9/323, Kannada 7/636 vs 25/636, Tamil 8/392 vs 32/392. **Fusion cuts false flags by two thirds or more in Kannada and Tamil, and makes them worse in Hindi**, where the `calibrate` threshold did not carry over. Calibration error (ECE) of the fused probability is 0.009.

Near-sound mistakes: 5/24 as `error` for both Prisma and fused. Fused sends another 9 to `unsure`, so 14/24 are not passed as correct.

**Passages.** Reading-accuracy bands (below 90%, 90–95%, 95% and up). An `unsure` word counts both ways. When the result could fall in two bands, the attempt is "needs a listen". Fused: 40 of 100 attempts need a listen, and 11 of the other 60 are placed in the wrong band. Prisma alone places all 100 and misplaces 39. The bands are a hard test here: most passages hold about two mistakes in 15–20 words, right at the 90% line, and about half the subtle mistakes are probably not in the audio, so the "true" band is itself uncertain.

**Verdict.** Against the predictions written before the run, fusion moved the right way but missed both margins we set. False flags were only 1.9 points below Prisma (we required 3), and catch as `error` was 3.6 points below (we allowed 3). So, as written in advance, the product keeps Prisma's marks for now. Everything else held, including calibration (ECE 0.009) and the predicted failures: near-sound catch, band misplacement and CPU latency. After the run we noticed that the agreement rule table would have met both margins (1.4% false flags, 73% catch). That is a lead for the next run, not a result.

### Limits

- **No held-out engine.** Every clip is Timbre v3.0, so the plan's exit check ("met on a held-out engine") could not be run. `test` has unseen passages but the same voice engine.
- **Small samples.** 24 near-sound mistakes and 100 attempts on `test`. Intervals are in `fusion_report.json`.
- **`test` was not fully unseen.** Prisma alone and the check alone were already reported on `calibrate` + `test` pooled in Phase 2. Only the fused systems are new on `test`.
- **The check knows the planting tables.** Its listed misreadings come from the same script tables that planted the mistakes. A child's misreading outside those tables is only caught by the free-reading margin, which is weaker.

## Learner model on simulated children (Phase 4)

Generated from `results/learner_study.json`; rerun with `scripts/learner_study.py` (no credits, about 2 minutes). Predictions and verdict: [PREDICTIONS.md](PREDICTIONS.md). Code: `src/akshara/learner/`, `src/akshara/core/difficulty.py`.

**What it is.**
- **Skill order per script.** Letters, vowel signs, short words, other letters, medium words, marks, conjuncts, long words. Within each stage, skills are ordered by how often they appear in the 413-passage bank. Hindi has 77 skills, Kannada 71 and Tamil 51. Every word maps to the skills it needs. The order is waiting on native review ([review/SKILL_ORDER.md](review/SKILL_ORDER.md)).
- **Mastery tracking.** Bayesian Knowledge Tracing per skill, with default parameters. A misread word is blamed mostly on its least certain skill. `unsure` counts as weak evidence and a teacher's correction as strong evidence.
- **Placement.** ASER's tree (paragraph, then story or words, then letters). It gives one extra item when `unsure` words leave the pass/fail call open.
- **Passage difficulty from text.** The mean of six standardised features, with equal weights and nothing fitted.

**Difficulty against StoryWeaver's level tag** (level 2 ranked above level 1): AUC 0.705 Hindi, 0.654 Kannada, 0.600 Tamil. Total length and word rarity carry most of it. The tag describes the book while our text is its short description, so this is a weak check.

**Placement**, 2,000 simulated children per language. Exact level, and within one level:

| Scorer | Hindi | Kannada | Tamil |
|---|---|---|---|
| Perfect | 1607/2000 (80.3%), 95.9% | 1676/2000 (83.8%), 97.9% | 1680/2000 (84.0%), 98.5% |
| Prisma alone | 1537/2000 (76.8%), 93.8% | 1418/2000 (70.9%), 94.3% | 1526/2000 (76.3%), 95.9% |
| Fused | 1341/2000 (67.0%), 87.5% | 1593/2000 (79.7%), 97.0% | 1569/2000 (78.5%), 97.2% |

The perfect-scorer row is the ceiling of a 5-letter / 5-word / one-passage test. A child near a pass line can go either way on one item. The fused scorer beats Prisma alone in Kannada and Tamil and loses in Hindi, where its false flags are higher (Phase 3). With the fused scorer a placement takes 2.45–2.73 items, and 16% of Kannada placements are marked uncertain for a teacher to check (Hindi 1.8%, Tamil 4.9%).

**Tracking**, 400 children per language, 150 practice words each. Final estimates separate known from unknown skills with AUC 0.921 Hindi, 0.850 Kannada and 0.910 Tamil (perfect scorer: 0.935, 0.867, 0.931). Using `unsure` as weak evidence, as right, as wrong, or ignoring it changes AUC by at most 0.016.

### Limits

- **Not blind.** The kept run is the third. Two design bugs were fixed after seeing earlier runs (PREDICTIONS.md). Only run 1 was a blind test, and it failed the placement predictions.
- **The simulated children follow the model's own assumptions.** This shows the machinery works and what scoring noise costs, not that children learn this way.
- **Lumpy population.** Few simulated children sit at the letter or paragraph level, so those calls are barely tested.
- **The skill order is unreviewed.** It is built from text frequency and fixed stages, and waits on native review.
- **Not built yet from Phase 4:** Evon practice passages (waits on where Evon runs), the reading buddy's voice, and equated passages for pre/post tests.
