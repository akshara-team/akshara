# Walkthrough

One short section per module: what it does, the one idea to remember, and where it is tested. Read in this order.

## `core/text.py`: normalise and compare words
Normalises Unicode (NFC), drops punctuation and zero-width characters, splits on whitespace. `loose_key` maps spelling variants to one form (Hindi nukta, chandrabindu/anusvara, nasal conjuncts, final यी/ये, वह/वो; Tamil trailing joining consonant). Kannada has no loose rules.
**Remember:** loose mode only merges variants of the same sound; it never merges different words. Tests: `tests/test_align.py`.

## `core/align.py`: align and score
Word-level edit distance between the passage and the transcript. Each passage word is `correct`, `substituted` or `skipped`; extra spoken words are `inserted`. Accuracy is correct ÷ words; WCPM is correct ÷ minutes. `insertion_near` finds an extra word beside a given passage word (used for repeats).
**Remember:** ties prefer a match, then a substitution, so one wrong word is one substitution, not a skip plus an insert.

## `core/parts.py`: split a passage into parts
Cuts the passage at sentence ends and packs whole sentences up to 12 words per part (about 15–20 s for a child). A sentence is only cut when it alone passes 20 words, and then into near-equal pieces. A part under 4 words ("Why?") joins its neighbour. The API sends the parts and scores an attempt against just the part read.
**Remember:** joining the parts gives back exactly the passage's words, so per-part scores add up to the whole. Tests: `tests/test_parts.py`.

## `core/script.py` and `core/aksharas.py`: script tables and written syllables
Per script: every consonant with its place, manner, voicing and aspiration; vowel signs and independent vowels with their length; which consonants are one sound feature apart; and which letters look alike (from `tables/glyph_similarity.json`, built by rendering each letter in three fonts and comparing shapes). Letters are looked up by Unicode name, so no code point is typed by hand. `aksharas.split` cuts a word into the units a child learns (स्कू · ल, ಪು · ಸ್ತ · ಕ, க · டை · க் · கு); in Tamil a pulli consonant stays its own letter.
**Remember:** nothing here is learned from data, so the tables are signed off by native speakers in `docs/review/SCRIPT_TABLES.md` before results built on them are published. Tests: `tests/test_script.py`.

## `core/plant.py`: plant mistakes for the study
Given a passage and a list of error kinds, returns what a reader would say and where each error is. Kinds: skip, near-sound (one consonant, never the last letter), distant (another word), half (first part only), repeat, self-correct. Seeded, so the same input always gives the same output. Errors are never adjacent. A second set of kinds (vowel length, vowel sign, look-alike letter, conjunct read apart, reversal, first-akshara guess, sounding out, long pause) is built on the script tables; `TAXONOMY` says for each kind whether it should be flagged and whether "not sure" is acceptable.
**Remember:** a near-sound change may be a non-word; children produce those too. The first set's output is byte-identical to before, so earlier study files rebuild unchanged. Tests: `tests/test_plant.py`.

## `core/pauses.py` and `core/wavio.py`: find pauses
Energy-based speech segments from a 16-bit mono WAV. Prisma gives no word timings, so the chunked re-check cuts at pauses it finds itself.
**Remember:** fluent speech has almost no word-level pauses; the method only works on halting reading. Tests: `tests/test_pauses.py`.

## `providers/`: speech services behind interfaces
`base.py` defines `SpeechToText` and `TextToSpeech`. `prisma.py` and `timbre.py` call Gnani with retries for the known quirks (429 "one request at a time", non-JSON gateway pages, streamed WAV headers). `fixture.py` replays recorded transcripts offline. `cache.py` caches by audio content and spaces calls out. `ledger.py` logs every paid call and enforces a cap.
**Remember:** `bias_list` is never sent and `format=verbatim` is always set. Tests: `tests/test_tts.py`, `tests/test_mitigation.py`.

## `mitigation.py`: chunked re-check
Cuts the audio at pauses and transcribes each piece alone, so the transcriber has little sentence context to autocorrect from. Falls back to the whole clip if no pause is found.
**Remember:** whether this helps is an open question; the prediction is in `docs/PREDICTIONS.md` and the result goes in `docs/RESULTS.md`.

## `service.py`, `store.py`, `api/`: the product
`assess` transcribes, scores and saves one attempt, keyed by request ID so a retry never makes a second paid call. `store.py` is SQLite with ordered migrations and keeps the full trace. `api/app.py` validates uploads (type, size, length), rate-limits, serialises Prisma calls, and serves the reading screen at `/`.
**Remember:** the service depends on interfaces, so tests and demos run offline. Tests: `tests/test_api.py`, `tests/test_store.py`.

## `scripts/`: the studies
`fetch_storyweaver.py` and `build_open_passages.py` build the passage set; `make_test_audio.py` and `make_variants.py` make the audio and the phone, noise and child-pitch variants; `go_no_go.py` transcribes and scores with strict and loose tables and a per-type breakdown; `make_halting_audio.py` and `halting_study.py` run the chunked-versus-whole test. All transcripts are cached, so a re-run costs nothing. The gate `tests/test_eval_gate.py` fails if committed results fall below the pass line.

## `dataset.py` and `bench.py`: the benchmark
A manifest lists every clip: what should be read, what the synthetic reader says, the planted mistakes, how the audio was made (engine, voice, speed, conditions) and its split. Splits are by passage family, so text never leaks between tune, calibrate and test; a `holdout` split is reserved for a speech engine never used in tuning. `bench.evaluate` scores one clip against its plants (caught, kept, false flags) and `summarise` rolls them up by any fields. `scripts/bench.py` runs it with no API calls.
**Remember:** `--dry-run` must be perfect (it checks the plants), and `--from-reports` reproduces the committed study numbers exactly (a test checks the base condition). Tests: `tests/test_plant_v2.py`.

