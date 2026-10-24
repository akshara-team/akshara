# Decisions

One entry per choice that someone could reasonably question. Newest last.

## Synthetic audio only
Gnani's rules forbid real children's voices and personal data. All clips are Timbre voices, some degraded by code (phone band, noise, pitch shift). The study says so wherever it reports a number.

## Never send `bias_list`, always `format=verbatim`
Boosting the passage's words makes the transcriber lean toward them, which hides misreads. Verbatim keeps repetitions and false starts. Both are enforced in `providers/prisma.py`.

## The scorer is pure code
`core/` has no network or model calls, so a score can be reproduced and explained word by word. A language model in the scoring path would make results unrepeatable.

## Strict and loose scoring are both reported
Real text has spelling variants the transcriber may write either way (Hindi nukta, chandrabindu/anusvara, nasal conjuncts, final यी/ये; Tamil trailing joining consonants). Loose mode treats those as equal. Kannada stays strict because vowel length changes meaning. Both numbers are published, so the loose rules cannot hide a bad result.

## Credits are capped and everything is cached
Every paid call is logged in `results/ledger.jsonl` with a hard cap, and transcripts are cached by audio content. A re-run of any study costs nothing.

## Providers sit behind interfaces
The service depends on a `SpeechToText` interface, not on Prisma. A recorded-fixture provider runs the app and the tests offline, and a mitigation or second model can be added without touching the scorer.

## Passages come from StoryWeaver, not from us
Story text needs a login, so passages are each book's published description (2–3 sentences, with level, publisher and URL). This avoids Kannada and Tamil errors written by us. They are blurbs, so they test reading mistakes, not reading level. The site states CC BY 4.0; we did not check each book.

## The first near-sound design was discarded
The first version of "near-sound" planting also changed vowel length, sibilants and word-final letters. On the first open-set run only 8 of 39 were caught, but most misses were changes the synthetic voice probably does not render audibly, so a miss said nothing about the transcriber. Near-sound planting now changes only a consonant (aspiration, voicing, place) and never the last letter. The first numbers are not reported as findings.

## Predictions are committed before the run
`docs/PREDICTIONS.md` was committed before any halting clip existed, so the chunked re-check result cannot be fitted to what we hoped for.

## Halting audio is built from separate chunks
Fluent Timbre speech has almost no pauses between words (1–4 segments per passage), and Prisma returns no word timings. To test a pause-based re-check fairly, 3-word chunks are synthesised separately and joined with 0.35 s of silence, like a halting reader.

## The chunked re-check is not part of the product
It did not raise near-sound catch (28% vs 31%) and raised Hindi false flags by 6 points ([RESULTS.md](RESULTS.md)). Shipping it would cost extra calls for no measured gain, so the product keeps the single whole-clip pass. The code and the test stay in the repo as a documented negative result.

## The per-word check uses MMS, a research-licence model
`facebook/mms-1b-all` covers Hindi, Kannada and Tamil in one model, writes each script letter by letter and has no language model, so it has no pull towards real words. That is the property Prisma lacks for reading assessment. It is CC BY-NC 4.0, which is fine for research and the challenge. A commercial build would swap in an MIT-licensed model such as AI4Bharat's IndicConformer behind the same `EvidenceSource` interface (`evidence/base.py`). It runs locally, so it costs no credits. It is an optional dependency group (`uv sync --group evidence`), so CI and the app do not need it.

## Evidence sources never decide
Each source (Prisma, the per-word check, the timing features) only reports evidence per word. The decision of correct, error or not sure is made in one place, the Phase 3 fusion step. That way sources can be compared alone on the benchmark and swapped without touching the decision rules.
