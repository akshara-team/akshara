# Akshara: a reading tutor that listens, and a measured map of what it can hear

Akshara is a reading tutor for early-grade children in Kannada, Tamil and Hindi. A child reads a story aloud; Gnani Prisma v2.5 transcribes it word for word, Akshara aligns the transcript to the text and marks each word green (read correctly) or red (skipped or different), and Gnani Timbre v3.0 helps with the missed words. Before trusting those marks with children, we measured them. Timbre made every test clip. Numbers below come from [RESULTS.md](RESULTS.md) and regenerate from cached results.

## The question
A tutor should catch the mistakes teachers care about. A speech recogniser is trained to write the word a speaker *meant*, which is what most products want; a reading tutor needs the word the child actually said. So it may quietly fix a mispronunciation. How often does that happen? We measured it on Prisma in verbatim mode; we expect the same pull in any recogniser trained this way, though we have not tested others.

## What we measured
90 passages (StoryWeaver book descriptions, 156 planted reading mistakes), read by Timbre voices, transcribed by Prisma:

| Planted mistake | Caught |
|---|---|
| Skipped word | 40 of 41 |
| Replaced by an unrelated word | 36 of 36 |
| Only the first half of a word | 28 of 34 |
| One consonant changed (a sound-alike) | **8 of 39 (21%)** |

Skips and clear substitutions are reliable. A single wrong consonant mostly is not: the transcript shows the correct word instead. That shaped the product more than any other result.

## What we tried
- **Is it sentence context?** Each changed word was spoken alone. The result was mixed (4 non-word reads, 18 corrected to the original, 17 other), so we cannot separate the transcriber from the synthetic voice.
- **Chunked re-check.** Cut the audio at pauses and transcribe each piece. With predictions written down first, near-sound catch stayed flat (31% whole vs 28% chunked) and Hindi false flags rose 6 points. It is not in the product.

- **Repeats and self-corrections** are kept in the verbatim transcript (12 of 14 and 14 of 15), so the app can show hesitation.

## What the product does about it
Akshara is built as a tutor around that limit rather than hiding it. It keeps Prisma's single pass (a per-word acoustic check and a fused scorer were measured too, and did not beat it by the margins set in advance), scores accuracy and words correct per minute, and shows a per-word trace. Words accepted only through a spelling-variant rule get a `?` ("check this word"). Then:
- **The teacher has the last word.** Marks most likely to be wrong (spelling-variant matches, a lone slip in a strong reading, unsure placements) go to a review queue with a clip of just that word; a teacher's mark replaces the computer's.
- **The numbers are in the app.** A "How reliable is this?" page shows the catch rates per language from the saved results, including the weak spot, with the study's limits.
- **Help aimed at the child's mistakes.** Missed words are practised straight away, akshara by akshara with Timbre, and a learner model picks the next story from what the child knows.

## Limits
- All audio is synthetic; no real children (Gnani's rules). Not validated on children's speech, and no teacher has yet marked the same readings to measure agreement.
- Passages are book descriptions, not graded reading texts, and were not reviewed by native speakers.
- Samples are small; intervals are wide (near-sound: about 11–36%).
- The synthetic voice may not pronounce a planted non-word clearly, so the 21% could understate Prisma.
- Phone-band, noisy and child-pitch audio are the same synthetic voices degraded by code, not real phones, classrooms or children. The pattern held in all three (consonant change caught 5–7 of 39).
- Prisma returns no word timings or confidence, which limits what a second pass can do.

## Models used
Gnani Prisma v2.5 (speech to text, `format=verbatim`, no `bias_list`), Timbre v3.0 (text to speech) and Evon v3.3 (practice sentences, offline, every sentence checked by code and approved by a teacher). Scoring is plain code with no language model.
