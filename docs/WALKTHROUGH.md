# Walkthrough

One short section per module: what it does, the one idea to remember, and where it is tested. Read in this order.

## `core/text.py`: normalise and compare words
Normalises Unicode (NFC), drops punctuation and zero-width characters, splits on whitespace. `loose_key` maps spelling variants to one form (Hindi nukta, chandrabindu/anusvara, nasal conjuncts, final यी/ये, वह/वो; Tamil trailing joining consonant). Kannada has no loose rules.
**Remember:** loose mode only merges variants of the same sound; it never merges different words. Tests: `tests/test_align.py`.

## `core/align.py`: align and score
Word-level edit distance between the passage and the transcript. Each passage word is `correct`, `substituted` or `skipped`; extra spoken words are `inserted`. Accuracy is correct ÷ words; WCPM is correct ÷ minutes. `insertion_near` finds an extra word beside a given passage word (used for repeats).
**Remember:** ties prefer a match, then a substitution, so one wrong word is one substitution, not a skip plus an insert.

## `core/plant.py`: plant mistakes for the study
Given a passage and a list of error kinds, returns what a reader would say and where each error is. Kinds: skip, near-sound (one consonant, never the last letter), distant (another word), half (first part only), repeat, self-correct. Seeded, so the same input always gives the same output. Errors are never adjacent.
**Remember:** a near-sound change may be a non-word; children produce those too. Tests: `tests/test_plant.py`.

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
