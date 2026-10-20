# Akshara: what a transcript-based reading screener can and cannot see

Akshara checks early-grade reading aloud in Kannada, Tamil and Hindi. A child reads a short passage; the app transcribes it with Gnani Prisma v2.5, aligns the transcript to the text, and marks each word green (read correctly) or red (skipped or different). Gnani Timbre v3.0 made every test clip. Numbers below come from [RESULTS.md](RESULTS.md) and regenerate from cached results.

## The question
A reading screener should catch the mistakes teachers care about. A speech-to-text system is trained to write the *intended* word, so it may quietly fix a mispronunciation. How often does that happen?

## What we measured
90 passages (StoryWeaver book descriptions, 156 planted reading mistakes), read by Timbre voices, transcribed by Prisma:

| Planted mistake | Caught |
|---|---|
| Skipped word | 40 of 41 |
| Replaced by an unrelated word | 36 of 36 |
| Only the first half of a word | 28 of 34 |
| One consonant changed (a sound-alike) | **8 of 39 (21%)** |

Skips and clear substitutions are reliable. A single wrong consonant mostly is not: Prisma writes the correct word instead.

## What we tried
- **Is it sentence context?** Each changed word was spoken alone. The result was mixed (4 non-word reads, 18 corrected to the original, 17 other), so we cannot separate the transcriber from the synthetic voice.
- **Chunked re-check.** Cut the audio at pauses and transcribe each piece. With predictions written down first, near-sound catch stayed flat (31% whole vs 28% chunked) and Hindi false flags rose 6 points. It is not in the product.

- **Repeats and self-corrections** are kept in the verbatim transcript (12 of 14 and 14 of 15), so the app can show hesitation.

## What the product does about it
It keeps one pass, scores accuracy and words correct per minute, shows a per-word trace, and says on every result that green does not prove a perfect reading. Words accepted only through a spelling-variant rule get a `?` ("check this word").

## Limits
- All audio is synthetic; no real children (Gnani's rules). Not validated on children's speech.
- Passages are book descriptions, not graded reading texts, and were not reviewed by native speakers.
- Samples are small; intervals are wide (near-sound: about 11–36%).
- The synthetic voice may not pronounce a planted non-word clearly, so the 21% could understate Prisma.
- Phone-band, noisy and child-pitch audio are the same synthetic voices degraded by code, not real phones, classrooms or children. The pattern held in all three (consonant change caught 5–7 of 39).
- Prisma returns no word timings or confidence, which limits what a second pass can do.

## Models used
Gnani Prisma v2.5 (speech to text, `format=verbatim`, no `bias_list`) and Timbre v3.0 (text to speech). Scoring is plain code with no language model.
