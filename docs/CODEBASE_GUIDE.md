# Codebase guide: what every part does, why, and how it connects

*Written 2026-10-29 by reading the code, not the older docs. Where this guide and an older doc
disagree, the code won; section 11 lists the disagreements. Section 12 says which files were read
in full and which were only skimmed.*

How to use it: read sections 1 to 4 once for the picture. After that, use sections 5 to 9 as a
reference, one file at a time.

---

## 1. The system in one page

Akshara listens to a child read a story aloud in Kannada, Tamil or Hindi, marks each word right or
wrong, helps with the missed ones, and tells the teacher who needs help with what.

Four jobs, four pieces of code:

| Job | Where it lives | Plain version |
|---|---|---|
| Hear the child | `providers/prisma.py` (Gnani's speech-to-text) | Turns a recording into text |
| Mark the reading | `core/` (our own code, no AI) | Compares that text with the story, word by word |
| Remember the child | `learner/`, `store.py` | Tracks which letters and sounds each child knows |
| Show it to people | `web/` (React app), `api/app.py` (the server) | Screens for the child and the teacher |

Gnani's two other models are used at the edges: **Timbre** (text-to-speech) says words and
instructions aloud, and **Evon** (a language model) writes practice sentences offline. Neither
touches the marking.

The most important design fact: **the marker is plain code with no AI in it**, so the same reading
always gets the same marks. Everything else is built around that.

## 2. Vocabulary

| Word | Meaning |
|---|---|
| **akshara** | A written syllable unit of an Indian script (a consonant or conjunct plus its vowel sign). What a child learns as one chunk. |
| **matra / vowel sign** | The mark added to a consonant to change its vowel. |
| **virama / pulli** | The mark that kills a consonant's vowel; it is how conjuncts are built (Tamil calls it pulli). |
| **conjunct** | Two or more consonants joined with no vowel between (स्कू). |
| **transcript** | The text a speech recogniser returns. |
| **verbatim** | Ask the recogniser for exactly what was said, not a tidied version. |
| **WCPM** | Words correct per minute. |
| **trace** | The saved word-by-word record of one reading: for each story word, what happened. |
| **idempotent** | Doing it twice has the same effect as once. |
| **mock / live** | The web app's two modes: pretend data, or the real server. |
| **BKT** | Bayesian Knowledge Tracing: a standard way to estimate whether a student knows a skill. |
| **ASER** | An annual survey of rural children's learning; its reading ladder is used for placement. |

## 3. Repo map

```
src/akshara/            the Python backend (about 12,900 lines)
  core/                 the marker and script knowledge: pure, no network
  providers/            connections to Gnani, plus caches and the call counter
  learner/              skills, mastery, placement, picking the next story
  content/              the passage bank and the practice-sentence bank
  evidence/ fusion.py   research: an acoustic second opinion, and combining it
  api/                  the FastAPI server and its request/response shapes
  service.py            "take a recording, mark it, save it"
  store.py              the SQLite database
  review.py             which marks a teacher should check
  retention.py          deleting old recordings
  settings.py           configuration from environment variables
  reliability.py        numbers for the "How reliable is this?" page
  bench.py dataset.py   the test harness (section 8)
web/src/                the React app the child and teacher use
scripts/                one-off tools: build data, run studies, make the demo video
tests/                  automatic checks; none call the paid API
data/                   passages, benchmark manifest, fonts
results/                saved study outputs, the call ledger, the cached transcripts
docs/                   plans, decisions, results, this guide
```

## 4. The main flows

### 4.1 A child reads one part of a story

```
ReadingScreen    records the mic, makes a 16 kHz WAV, invents a request id
   |
CheckingScreen   api.submitAttempt(...)  ->  POST /v1/attempts  (header X-Request-ID)
   |                                            |
   |   no connection? -> state/outbox.ts        | api/app.py create_attempt
   |   keeps the clip in IndexedDB,             |   limit, size, WAV and length checks
   |   resends later with the same id           |   under stt_lock:
   |                                            |     already seen this id?  (retry flag)
   |                                            |     service.assess():
   |                                            |       stored result? return it
   |                                            |       transcribe_reading() -> Prisma (cached, capped)
   |                                            |       core.align.score()   -> a mark per word
   |                                            |       store.save_attempt() -> SQLite
   |                                            |   keep recording if parent consented
   |                                            |   if child known and not a retry:
   |                                            |       learn() -> BKT update -> skill_state
   v
FeedbackScreen   shows right/wrong words; missed words go to PracticeScreen
```

### 4.2 Practising a missed word

`PracticeScreen` asks `/v1/aksharas` for the word's pieces, plays each piece and then the whole
word through Timbre (`/v1/feedback/audio`, cached), records the re-read, and posts it to
`/v1/practice`. That endpoint scores the single word and feeds the result to the learner model.

### 4.3 A practice sentence

`GET /v1/children/{id}/sentence` picks a sentence for the skills the child is weakest on
(`content/bank.py: targets_for` then `pick`). Evon-written sentences are used only after a teacher
approved them (`sentence_reviews` table). Otherwise a sentence cut from a published story is used.
The child reads it and `POST /v1/sentences/{id}/read` scores it and updates the model.

### 4.4 Placement (finding a child's level)

A teacher starts a placement. The server sends one item at a time (letters, words, a paragraph or
a story). The child reads it, `POST .../read` scores it without saving, the teacher confirms or
fixes the marks, and `POST .../answer` records them. `learner/placement.py` decides the next task
or the final level (beginner, letter, word, paragraph, story).

### 4.5 Teacher review

`GET /v1/review` lists words worth hearing (`review.reasons`). The teacher plays a short clip of
just that word (`/v1/attempts/{id}/words/{i}/clip`, estimated from pauses) and marks it correct,
misread or skipped. The mark replaces the scorer's, and teaches the learner model with extra weight.

---

## 5. Backend, file by file

### 5.1 `core/`: the marker and script knowledge

Rule for the whole folder: **no network, no randomness, no model calls**. Same input, same output.

**`text.py`** (71 lines). `normalize` applies Unicode NFC, drops punctuation (including the Hindi
danda) and zero-width characters, lowercases Latin text. `words` splits into words. `loose_key`
maps harmless spelling variants to one form: Hindi nukta, chandrabindu versus anusvara, nasal plus
virama, final यी/ये versus ई/ए, वह versus वो; Tamil trailing joining consonants; Kannada only a
word-final vowel length (mid-word length changes meaning, so it stays strict).
*Why it works:* a recogniser may spell a word a valid alternative way; without these rules the
child is marked wrong for the recogniser's spelling habit.

**`align.py`** (114). `align` is word-level edit distance (the same dynamic programming used to
diff files): fill a table of the cheapest way to turn the story into what was heard, then walk back
to label each word `correct`, `substituted`, `skipped`, or `inserted` (extra spoken word). Ties
prefer a match, then a substitution, so one wrong word is one substitution, not a skip plus an
insert. `score` wraps it: accuracy is correct divided by story words, WCPM is correct divided by
minutes. `flagged_indexes` lists substituted and skipped story words. `insertion_near` finds an
extra word beside a given word (used to see whether a repeat was kept).
*Connects to:* called by `service.assess`, the API's placement/practice/sentence endpoints, and
`bench.evaluate`.

**`script.py`** (248). Pure data about Devanagari, Kannada and Tamil: for every consonant its place
of articulation, manner, voicing and aspiration (`_FEATURES`), the vowels and their length, and
look-up helpers. Characters are found by Unicode name (`"KANNADA LETTER KHA"`), so no code point is
typed by hand. `sound_link` says whether two consonants are exactly one feature apart (voicing,
aspiration, place, nasal, sibilant, liquid). `visual_neighbours` reads `tables/glyph_similarity.json`
(letters that look alike, built by `scripts/build_glyph_table.py`).
*Why:* the likely confusions for any word can be generated from the script itself, with no labelled
data. The tables still need native-speaker sign-off (`docs/review/SCRIPT_TABLES.md`).

**`aksharas.py`** (72). `split(word, lang)` cuts a word into aksharas. Unicode's own grapheme rules
do not join conjuncts across the virama for Kannada and Tamil, so this is hand-written. Tamil is
special: a consonant with pulli is its own letter and never joins the next one, except க்ஷ.
`parse` takes one akshara apart into consonants, vowel, vowel sign, dead-or-not, marks, and
`rebuild` puts it back (a tested round trip).
*Connects to:* practice (`/v1/aksharas`), skills, difficulty, wordspans, planting.

**`parts.py`** (63). `split_parts` cuts a passage into parts a child reads one at a time: whole
sentences packed up to 12 words, a sentence cut only when it alone passes 20 words, tiny parts
(under 4 words) merged into a neighbour. Joining the parts gives back exactly the passage's words.
*Why 12 words:* at 35 to 54 words a minute, that is about 15 to 20 seconds, safely under Prisma's
roughly 30 second limit.

**`pauses.py`** (86). `segments` finds stretches of speech in a mono signal by frame energy:
frames quieter than 10% of the loud level count as silence, and a silence of at least 0.25 s
separates segments. `cut` slices the audio; `windows` groups a long clip into windows of at most
`max_s` seconds, cutting in the middle of pauses so no word is split.
*Why it exists:* Prisma returns no word timings, and rejects long clips.

**`wavio.py`** (25). Read and write 16-bit mono WAV as numpy arrays.

**`wordspans.py`** (49). `spans` estimates where each word sits in a recording, so a teacher can
hear just that word. It finds speech segments, lays them end to end, gives each word a share in
proportion to its number of aksharas, maps that back to clock time across the pauses, and pads each
span by 0.5 s. It is an estimate, not a measurement; the API labels clips approximate
(`X-Clip-Approximate`).

**`difficulty.py`** (97). Scores a passage's difficulty from its text alone: aksharas per word,
conjunct share, vowel-sign share, word rarity within the bank, words per sentence, total length.
Each feature becomes a z-score within the language's bank and the score is their plain mean (equal
weights on purpose: nothing to fit them on until real attempts exist).

**`confusions.py`** (43). For a word, the likely misreadings: one close-sound consonant change, the
look-alike letters, vowel length, vowel sign, conjunct read apart. Used by the acoustic check
(`evidence/words.py`) as the alternatives to compare against.

**`plant.py`** (297). Plants known mistakes into a passage for the study (section 8). `TAXONOMY`
says, per mistake type, whether a good detector should flag it and whether "not sure" is acceptable.
The first set (skip, near, distant, half, repeat, selfcorrect) is deliberately unchanged by the
second set so older results rebuild identically. Seeded with `random.Random(f"{seed}:{pid}")`, so
it is repeatable. Near-sound changes touch only a consonant and never the last letter, because the
first experiment showed changes the synthetic voice does not audibly render.

**`stats.py`** (26). `wilson` gives a 95% interval for "k of n", used for every catch rate on the
reliability page. `auc` is the chance a random positive outscores a random negative.

### 5.2 `providers/`: talking to the outside, safely

**`base.py`** (20). Two `Protocol`s, `SpeechToText` and `TextToSpeech`. A Protocol is a promise
about shape ("has a `transcribe(audio, language)` method"); anything matching it works. This is how
the app swaps real, cached, and fake providers without the rest of the code knowing.

**`prisma.py`** (80). Calls Gnani's STT (`api.vachana.ai/stt/v3`) with `format=verbatim` and no
`bias_list`. Retries up to 6 times with growing delays on 429 and 5xx, and on empty or HTML
(gateway) responses. It writes the call to the ledger first, so the cap is checked before any
paid call. `PrismaSTT` wraps it in the interface.

**`cache.py`** (32). `CachedSTT`: hashes the audio plus the language with SHA-256; if a saved
transcript exists, return it with no call; otherwise call, save, and sleep 1.5 s (other teams hit
rate limits on back-to-back calls).

**`ledger.py`** (27). Appends one line per paid call to `results/ledger.jsonl`. `record` raises
`CapExceeded` if the count has reached `AKSHARA_MAX_CALLS` (default 600) *before* logging the call.

**`timbre.py`** (84). Text-to-speech. Sends text, voice, model, language and speed; retries on
429/500/503. `fix_wav_header` repairs Timbre's streamed WAVs, which carry `0xFFFFFFFF` as chunk
sizes that some readers treat as empty or huge.

**`audio_cache.py`** (30). `CachedTTS`: same idea as `CachedSTT`, keyed by text, language and
voice. This is why spoken instructions cost at most one call per line per language, ever.

**`fixture.py`** (29). `FixtureSTT` replays recorded transcripts by file name, so the app and
tests run with no API. `from_cache` builds it from `results/transcripts/`.

**`evon.py`** (63). A client for Evon served behind an OpenAI-compatible API (vLLM or llama.cpp).
It disables "thinking" (a short JSON answer needs none) and strips any leftover `<think>` block.
Evon is open-weights and too big for a laptop, so it only runs in offline batches.

### 5.3 `learner/`: what the child knows and what comes next

**`skills.py`** (171). Defines a *skill* as one thing a word asks of the reader: a letter
(`letter:ಕ`), a vowel sign, a mark, a conjunct, or a word-length band. `build` creates a
*curriculum* for a language from its passages and orders it the way scripts are usually taught:
common letters, vowel signs, short words, other letters, medium words, marks, conjuncts, long
words. `Curriculum.skills_of(word)` lists the skills a word needs.
*Why this order:* every word needs one length skill, so short words must come early. An earlier
order put all lengths last, and then no word could be "known" until the whole curriculum was.

**`bkt.py`** (98). For each skill, one number: the probability the child knows it. Four parameters
(`p_init` 0.3, `p_learn` 0.05, `p_slip` 0.1, `p_guess` 0.2). One word result updates every skill in
the word; a wrong word blames its skills in proportion to how doubtful each already was. Evidence is
weighted: scorer 1.0, "unsure" 0.3, a teacher's mark 2.0 (a weight is an exponent on the
likelihood). The defaults are textbook guesses a pilot would refit.

**`placement.py`** (83). The ASER ladder as a small state machine. Start at "paragraph"; pass leads
to "story", fail leads to "words", and so on down to "beginner". Letters and words pass at 80%
(4 of 5), paragraph and story at 85%. If "unsure" words decide whether the child passes, one more
item is given, then unsure counts as half right and the result is flagged `uncertain` for a teacher.

**`tutor.py`** (206). Glues the above to the passage bank. `library` builds, per language, passage
ids, difficulty ranks, the curriculum, simple words and early letters. `placement_item` makes the
next item (seeded, so replaying gives the same item). `states` converts scorer marks to
correct/error/unsure. `next_passage` picks a difficulty band from the level (moved up after two
strong readings, down after two weak ones), then picks the passage inside it that exercises the most
weak skills, skipping the last three read.

**`simulate.py`** (109). Simulated children with known skills, used to test placement and tracking
with no real children. Each simulated reading passes through a "scoring channel" built from the
measured error rates, so tests include realistic scorer noise.
*Honest limit (stated in the file):* this tests the model against its own assumptions; it cannot
show that real children learn this way.

### 5.4 `content/`

**`bank.py`** (95). Chooses the practice sentence. `load` merges Evon's sentences (re-checked on
load, so a hand-edited or stale row never reaches a child) with sentences cut from published
stories. `targets_for` takes the skills the child is working on, else the next unlearned ones.
`pick` returns the first usable sentence for the first target: approved Evon sentences written for
that skill first, then any approved one using it, then a story sentence; least-read wins.

**`sentences.py`** (142). Everything about Evon sentences. `prompt` builds a short system and user
message asking for exactly `{"sentences": [...]}`. `parse` pulls the JSON out of the reply.
`problems` is the safety net, all code: only the language's script, 3 to 8 words, at most 60
characters (Timbre's limit), must use the target skill, every word must be decodable at that point
in the curriculum, no blocked words, no repeats. Anything Evon returns that fails is thrown away.

**`passages.py`** (21, at the package top level, not in `content/`). Loads the JSONL passage bank
and attaches the catalogue fields (title, publisher, URL, licence) from the sources file.

### 5.5 The pipeline and storage

**`service.py`** (115). `assess` is the heart: (1) if this `request_id` already has a saved result,
return it, with no second paid call; (2) `transcribe_reading` (one call if the clip is 25 s or
less, otherwise cut at pauses into windows and join the texts); (3) `score` against the reference,
loose for Hindi and Tamil, strict for Kannada; (4) build the trace; (5) `store.save_attempt`.
The `check` flag in the trace marks a word accepted only through a spelling-variant rule.

**`store.py`** (430). SQLite with numbered migrations: the database remembers its version with
`PRAGMA user_version` and runs only the newer steps. Tables: `learners` (children), `attempts`,
`placements`, `skill_state`, `reviews` (teacher marks), `sentence_reviews`, `sentence_reads`.
Two details worth knowing:
- `@_one_at_a_time` wraps every method in a re-entrant lock. The server handles requests on several
  threads that share one connection; without the lock, one request's commit could cut off another's
  query (CI caught exactly this).
- `PRAGMA secure_delete = ON` overwrites deleted rows, and `delete_child` removes attempts, marks,
  placements and skill state in one transaction, then returns the audio file names for the caller
  to delete from disk.
`child_attempts` applies teacher marks on top of the stored trace, keeping the scorer's version in
`scorer_trace`, so the original is never lost.

**`review.py`** (56). `reasons` lists words worth hearing: accepted only via a spelling-variant
rule, or the lone slip in an otherwise strong reading (accuracy at least 0.8, where a "mistake" is as
likely to be mishearing as misreading). `apply` overlays teacher marks. `state_of` turns a teacher's
mark into learner-model evidence.

**`retention.py`** (41). `purge` deletes recordings older than the limit (30 days) and also any
orphaned file older than that. The reading's words and scores stay; only audio goes. File names come
from the database, never from a request, and must stay inside the folder (path-traversal guard).

**`settings.py`** (42). Configuration from environment variables with safe defaults (provider
`fixture`, 3 MB upload cap, 90 s audio cap, 30-day retention). Secrets never have defaults.

**`reliability.py`** (59). Builds the numbers for the "How reliable is this?" page from committed
study files, with Wilson intervals. A test fails if the web app's copy of the numbers drifts from
the results.

### 5.6 `api/`

**`schemas.py`**. Pydantic models for every request and response. Notable: `AttemptOut` carries a
`NOTICE` string saying green does not prove a perfect reading; `ChildIn` requires `consent_date`
("no consent, no child") and rejects a date more than a day in the future.

**`app.py`** (735 lines, one `create_app` factory). The factory lets tests inject a fake provider,
a temporary database, a fake TTS. Things to understand:
- `stt_lock` serialises Prisma calls (Gnani allows one active request at a time). The "is this a
  retry?" check happens *inside* that lock, so two copies of one upload arriving together cannot
  both count as new.
- `limit()` is an in-memory rate limiter: 30 requests per 60 s per client address.
- `learn()` loads the child's skills, applies results, and saves.
- Recording is kept only when the child exists and has a consent date.
- `purge_old_recordings()` runs at start and then at most hourly, triggered by incoming requests.
- Three endpoints (placement read, practice, sentence read) repeat the same upload-validation
  block; see section 11.
- Error mapping: `CapExceeded` becomes 503, `ProviderError` becomes 502. The web app's
  `CheckingScreen` uses these to choose the right recovery screen.

### 5.7 Research layer (not in the app)

These were built and measured; the app does not use them because they did not beat Prisma alone.

**`mitigation.py`** (31). Chunked re-check: cut at pauses, transcribe each piece alone, so the
recogniser has less context to autocorrect from. Measured: no gain (28% versus 31%), more false flags in Hindi.

**`evidence/`**. `base.py` is the interface (`EvidenceSource`). `ctc.py` is CTC scoring in plain
numpy: `viterbi` (best alignment of known letters to audio frames), `forward` (total probability),
`greedy` (the model's free reading). `words.py` aligns the whole story to the audio, then for each
word compares how well the word fits against its best likely misreading (`margin_alt`) and against
the model's free reading (`margin_free`). `mms.py` runs Meta's MMS-1b-all model (research licence,
optional install) and caches its output per clip. `scoring.py` sets thresholds from correctly read
words only, so planted mistakes never influence where the line goes.

**`fusion.py`** (255). Combines Prisma and the acoustic check into correct, unsure or error: a
transparent agreement table (`rule_state`) and a small logistic regression with isotonic
calibration and thresholds chosen to hold false flags to a target. Also `band`/`passage`, mapping
accuracy to frustration, instructional or independent (Betts levels). *Not shipped:* it missed its
pre-registered margins.

---

## 6. The web app, file by file

Stack: React 18, TypeScript, Vite, react-router, Vitest. No state library: React context plus local
storage plus IndexedDB.

**`App.tsx`**. All routes. Every screen is wrapped in its own `ErrorBoundary` keyed by path, so one
crashed screen does not take down the rest. `useFocusOnRouteChange` moves focus to the new screen's
heading (for screen readers). `Shell` also starts `useOutboxSync`, which resends offline readings.
`Entry` sends a returning child straight home.

**`api/index.ts`**. The seam. It defines an `Api` type listing everything the screens can ask for,
builds a `mock` implementation and a `live` one, and picks with `VITE_API_MODE` (default mock). Every
screen imports `api` and does not know which it got. `storyFor` decides the next story: teacher's
choice, else the learner model's pick, else the first story in the language.

**`api/live.ts`**. `fetch` calls to `/v1/...`. `submitAttempt` sends a multipart form and an
`X-Request-ID` header. `ApiError` carries the HTTP status so screens can react.

**`api/mock.ts`, `mockClass.ts`, `teacherData.ts`, `classSummary.ts`, `placement.ts`, `types.ts`**.
`mock.ts` has fake attempts plus the real recorder and WAV encoder (`createRecorder`, `encodeWav`,
`checkClip`, which rejects silent or under 0.7 s clips). `mockClass.ts` (637 lines) is an in-browser
fake of the whole teacher side. `classSummary.ts` turns `/v1/children` into the dashboard roster:
status is "new" with no readings, "in-target" if WCPM is at least the band's lower edge, else
"practise". `teacherData.ts` holds the **placeholder** band `{min: 35, max: 54}` for every
language and grade (see section 11).

**`state/session.tsx`**. React context holding the current language, reader, passage, parts, and
the recording waiting to be checked. `beginPassage` creates a `sessionId`, which groups the parts
of one story into one reading on the server.

**`state/storage.ts`**. The child's device-local record in `localStorage`, wrapped in try/catch
because storage can be missing or full. `buildReading` returns null until every part has an attempt,
so a half-read story is never saved as a reading.

**`state/outbox.ts`**. The offline queue. Readings recorded with no connection are kept in
IndexedDB (a recording is too big for localStorage), each with the request id given when it was
recorded. `flush` sends oldest first, stops at the first retryable failure, drops a reading the
server refuses outright or that has failed 20 times, and allows one flush at a time. `useOutboxSync`
retries on app open, on the `online` event, and every 30 s. *Why it is safe:* the server answers a
repeated id with the stored result.

**`i18n/index.tsx`**. Child-facing text in the child's language. `en.json` has every key; a missing
key in `kn/ta/hi.json` falls back to English and the text is tagged `lang="en"`, so a screen reader
does not read English with a Kannada voice. `Tx` renders a span with the right `lang` and script class.

**`audio/`**. `meter.ts` opens the microphone level meter. `noise.ts` is pure level maths: a room is
"noisy" above -35 dB background; a clip is noisy if its quiet floor is too loud or speech is under 8
dB above it. The thresholds are admitted guesses and never block a child. `playback.ts` plays
Timbre audio from `/v1/feedback/audio`, falling back to the device voice.

**Child screens (`screens/child/`)**: `RoleSelection` and `ChooseReader` (who is reading),
`ChildHome`, `ReadingScreen` (record), `CheckingScreen` (submit, classify failures, queue offline),
`FeedbackScreen` (per-part result), `ResultsScreen` (whole story), `PracticeScreen` (akshara
practice, at most 3 words, 2 tries each), `SentenceScreen` (the practice sentence).

**Teacher screens (`screens/teacher/`)**: `TeacherDashboard` (class), `ChildForm` (add/edit, consent
required), `ChildProfile`, `AttemptDetails`, `PlacementScreen`, `SelectStory`, `ReviewScreen` (the
word-clip queue), `SentencesScreen` (approve Evon sentences), `ReliabilityScreen`.

**`recovery/`**. Friendly screens for microphone, offline, speech-service and general failures.

**`components/`**. Small accessible UI pieces (buttons, inputs, `MicButton`, `LevelMeter`,
`NoiseCheck`, `ListenButton`, `SayButton`, `WordChip`, icons as inline SVG).

---

## 7. Tests

About 2,800 lines in `tests/` plus 24 web test files. None call the paid API. By area:

| Area | Files |
|---|---|
| The marker | `test_align`, `test_parts`, `test_pauses`, `test_wordspans`, `test_script` |
| The harness | `test_plant`, `test_plant_v2`, `test_variants`, `test_holdout`, `test_eval_gate`, `test_go_no_go_dry_run`, `test_open_passages` |
| Research layer | `test_ctc`, `test_evidence_words`, `test_evidence_scoring`, `test_fusion`, `test_mitigation` |
| Learner | `test_learner`, `test_tutor`, `test_sentences` |
| Product | `test_api`, `test_children`, `test_store`, `test_store_threads`, `test_review`, `test_trust`, `test_offline`, `test_long_reading`, `test_end_to_end` |
| Numbers vs docs | `test_reliability` |

Two worth knowing: `test_store_threads.py` reproduces the shared-connection race the lock fixes, and
`test_eval_gate.py` fails the build if committed study results fall below the pass line.

## 8. The test harness (how Akshara measures itself)

1. **Plant** known mistakes (`core/plant.py`) into real passages.
2. **Render** audio of the mistaken reading with synthetic voices (`scripts/make_test_audio.py`,
   `render_manifest.py`, `render_holdout.py`), including degraded copies (phone band, noise, child pitch;
   `make_variants.py`).
3. **Transcribe** with Prisma (`scripts/go_no_go.py`), cached so re-runs are free.
4. **Judge** (`bench.py`): a planted word mistake is "caught" if the scorer flagged that word; a "false
   flag" is a flagged word that was not planted. `summarise` rolls up by condition and language.
5. **Split honestly** (`dataset.py`): the split is a hash of the passage family, so one text never
   sits in two splits; a `holdout` split is audio from an engine never used for tuning.
6. **Pre-register** predictions (`docs/PREDICTIONS.md`) before runs.
7. **Gate** (`test_eval_gate.py`, `scripts/check_numbers.py`).

`scripts/` (3,666 lines) falls into: build data (`build_*`, `fetch_storyweaver`), make audio
(`make_*`, `render_*`, `record`), run studies (`go_no_go`, `halting_study`, `isolated_control`,
`evidence_study`, `evidence_report`, `fusion_report`, `learner_study`, `context_analysis`), check
(`bench`, `check_numbers`, `live_check`), export for native review (`export_script_review`,
`export_skill_order`), and make the demo (`make_demo_video`, `build_sentences`, `build_reliability`,
`evon_sentences`).

## 9. Data and results

`data/open_passages/` is the passage bank (StoryWeaver blurbs). `data/bench/` is the benchmark
manifest. `data/practice/sentences.jsonl` (Evon's checked sentences) does not exist yet because the
Evon batch has not run. `results/` holds study outputs, cached transcripts and audio, the call ledger,
and `akshara.sqlite`, the live database.

## 10. Why it works: the ideas holding it together

1. **Pure marker.** Repeatable, explainable word by word. Nothing probabilistic sits in the path from
   transcript to mark.
2. **One interface per outside thing.** Real, cached and fake providers are interchangeable, which is
   what makes offline demos, free tests and budget safety possible.
3. **Content-addressed caching.** Keying by a hash of the input means "same input" is recognised
   without bookkeeping, so re-running a study costs nothing.
4. **Idempotent by request id.** The id is chosen on the device at record time, travels through the
   offline queue and the API, and is a unique key in the database. That one decision makes retries,
   offline sending and double-taps safe.
5. **Honest uncertainty.** The recogniser is known to miss single-sound changes, so the system flags
   what it cannot judge, shows the catch rates, and lets a teacher override with higher weight.
6. **Evidence is kept.** The trace and (with consent) the audio persist, so any mark can be audited
   or corrected without losing the original.
7. **Everything bounded.** Upload size, audio length, rate limit, paid-call cap, retention window,
   retry counts, sentence length, practice words: each has an explicit limit in code.
8. **Mock/live seam.** The web app can run with no backend, which makes the demo, the tests and the
   public page possible.

## 11. Things I noticed (bugs, stale text, risks)

Not fixed here; listed so you can decide.

1. **The benchmark band is wrong for two of three languages.** `web/src/api/teacherData.ts:8` uses
   35 to 54 words per minute for every language and grade. That equals Hindi's FLS "Meets" band only
   (Kannada is 30 to 48, Tamil 28 to 49). `classSummary.ts:63` uses it to decide "in-target".
   `README.md` line 10 calls 35 to 54 a NIPUN Bharat target, which I could not verify.
2. **`docs/ARCHITECTURE.md` is stale** in its "Not built or not verified" section: it says Evon is not
   used and spoken instructions are not built. Spoken instructions are built; the Evon pipeline is
   built but its batch has not run.
3. **Repeated upload validation.** `api/app.py` repeats the same size, WAV and length checks and the
   same `stt_lock` / error-mapping block in `create_attempt`, `read_placement_item`, `practice` and
   `read_sentence`. A shared helper would cut about 60 lines and remove the risk of the copies drifting.
4. **The ledger default cap is 600** (`ledger.py`), while `STATUS.md` reports 2,136 logged calls. The
   cap must be raised through `AKSHARA_MAX_CALLS`; if it ever is not, the app will refuse paid calls
   with a 503. Worth confirming the intended value.
5. **`calls_so_far` re-reads the whole ledger on every paid call.** Fine at this size; it grows linearly.
6. **Purging is request-driven.** `purge_old_recordings` runs only when a request arrives, so an idle
   server deletes nothing. Acceptable for a demo; a real deployment would want a timer.
7. **No logins.** One server serves one class, and any client that can reach the API can read every
   child's data. The docs say so; it matters before anything real is deployed.
8. **Local files in the repo root** (`baton-n*.txt`, `dump.txt`, exported chat logs) are untracked
   working files. `.gitignore` already lists `baton`; check the exported chat logs and `dump.txt`
   before making the repo public.
9. **Unreviewed text.** Kannada, Tamil and Hindi child text and the script tables are not yet
   native-reviewed.

## 12. What I read in full, and what I did not

**Read in full:** everything in `src/akshara/core/`, `providers/`, `learner/`, `content/`, `evidence/`,
`service.py`, `store.py`, `review.py`, `retention.py`, `settings.py`, `reliability.py`, `mitigation.py`,
`passages.py`, `bench.py`, `dataset.py`, `fusion.py`, `api/app.py`; in the web app `App.tsx`,
`api/index.ts`, `api/live.ts`, `api/classSummary.ts`, the first 80 lines of `api/mock.ts`,
`state/outbox.ts`, `state/session.tsx`, `state/storage.ts`, `i18n/index.tsx`, `audio/noise.ts`,
`audio/playback.ts`, `ReadingScreen.tsx`, `CheckingScreen.tsx`, and the first 120 lines of
`PracticeScreen.tsx`.

**Only skimmed or inferred from names and docstrings:** the rest of `api/schemas.py`; the bodies of
all `scripts/` (I read each script's docstring only); all test files (names and the areas above, not
their contents); the web's teacher screens, `FeedbackScreen`, `ResultsScreen`, `SentenceScreen`,
`mockClass.ts`, `components/`, CSS, and the web tests; and the older docs. Descriptions of those are
based on their names, docstrings and how other files call them, so treat them as likely, not verified.
