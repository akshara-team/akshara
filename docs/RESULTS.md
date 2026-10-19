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
