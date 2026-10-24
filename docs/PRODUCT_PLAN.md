# Akshara: the full product plan

*Written 2026-10-24. Planning assumption: unlimited time, but **no data from real teachers or
children**. Everything has to be built, measured and defended on synthetic data, and be ready to
learn the moment real data exists. The demo and the post are out of scope here.*

---

## 0. The premise

Akshara today is a speech-to-text call plus a scorer. It catches skipped and unrelated words,
but hides most subtle misreads (8 of 39 single-consonant changes caught), because Prisma's
language model "fixes" them. The chunked re-check did not help.

"Perfect" without real data means five things:

1. **Every claim is measured** on a synthetic benchmark, and the likely gap to real children is
   stated next to it.
2. **The system says "not sure"** instead of guessing, and sends doubt to a person cheaply.
3. **It is ready for real data on day one**: a pilot becomes a calibration run, not a rebuild.
4. **Each Gnani model does what it is best at**: Prisma for open transcription and live
   streaming, Timbre for every voice the child hears, Evon for writing content in Indian
   languages. Nothing in the scoring path depends on an LLM.
5. **It stays small and explainable**: each workstream is one module that one of us can explain
   in an interview.

### Five ideas the plan rests on

| # | Idea | Why it matters |
|---|---|---|
| 1 | **We know the text, so verify it instead of transcribing it.** | A transcriber guesses what was said from scratch; a verifier asks "was *this* word said, or something close to it?" That is a much easier question, and it is the standard method in pronunciation assessment (goodness of pronunciation, GOP). |
| 2 | **Indian scripts are close to phonemic and laid out as a sound grid.** | ಕ ಖ ಗ ಘ ಙ differ by voicing and aspiration in a fixed pattern. The likely confusions for any word can be generated from the script itself, with no labelled data. |
| 3 | **Optimise the decision, not the transcript.** | What matters is whether a child is below, at or above the benchmark. A WCPM error of 5 is harmless at 80 and decisive at 38. |
| 4 | **Hold out a whole voice engine as the stand-in for real children.** | Test on audio from a speech synthesiser the system was never tuned on. The drop from "seen" to "unseen" engines is our best estimate of the sim-to-real gap. |
| 5 | **Every score keeps its evidence.** | Audio plus a word-by-word trace makes each assessment auditable. That is what a government buyer cannot get from paper assessments. |

---

## 1. Product definition

**One line:** Akshara listens to a child read aloud in Kannada, Tamil or Hindi, finds exactly
which letters and words they struggle with, gives them practice built for those gaps, and gives
the teacher a class grouped by level, with every score backed by audio.

**Users and their jobs**

| User | Job | What Akshara does |
|---|---|---|
| Child (6–9) | Learn to read; stay motivated | Reads with a voice buddy; practice made from their own mistakes; no reading needed to use the app |
| Teacher | Know where each child is without an hour of one-to-one listening; group the class | Whole class assessed in parallel; groups by level; a short "listen to these 6 words" review queue |
| School / block / district | Report against NIPUN Bharat; trust the numbers | Roll-ups by level and skill; audio-backed audit trail |
| Parent | Help at home with a basic phone | Child reads over WhatsApp or a phone call; a voice note comes back |
| NGO / funder | Measure programme impact | Pre/post assessments on equated passages; exportable data |

**What it is not:** not a general ASR product, not a chatbot tutor, not a grading tool that
decides alone. A person can always override, and the system abstains when unsure.

**Grounding in existing practice** (so judges and buyers recognise it):
- **ASER levels**: beginner, letter, word, Std I paragraph, Std II story.
- **NIPUN Bharat** oral reading fluency targets per grade (verify the exact figures per
  language before quoting them).
- **Teaching at the Right Level (TaRL)**: group children by level, not by grade.
- **EGRA-style assessment**: fluency plus comprehension.

---

## 2. Architecture

```
                         ┌────────────────────── Device (PWA, offline-first) ──────────────────────┐
                         │ mic → VAD → audio-quality check (level, clipping, SNR) → part recorder   │
                         │ offline queue · cached passages + Timbre audio · live pointer (practice) │
                         └───────────────┬─────────────────────────────────┬────────────────────────┘
                                         │ attempt (WAV + passage/part)    │ live stream (practice)
          WhatsApp voice note ──► channel adapters ◄── phone call (Inya / Pipecat, 8 kHz)
                                         │
                                ┌────────▼────────┐
                                │   API + queue   │  idempotent attempts, per-org budgets
                                └────────┬────────┘
               ┌─────────────────────────┼──────────────────────────┐
     ┌─────────▼─────────┐   ┌───────────▼───────────┐   ┌──────────▼──────────┐
     │ Evidence sources  │   │  Learner model        │   │ Content engine      │
     │ 1 Prisma verbatim │   │  skill graph per      │   │ passage bank +      │
     │ 2 forced aligner  │──►│  script, mastery,     │──►│ Evon decodable text │
     │ 3 per-word verify │   │  placement, bands     │   │ + validators        │
     │ 4 pause/prosody   │   └───────────┬───────────┘   │ Timbre audio cache  │
     └─────────┬─────────┘               │               └─────────────────────┘
       ┌───────▼────────┐        ┌───────▼────────┐
       │ Fusion +       │        │ Teacher review │◄── word clips cut by aligner timings
       │ calibration →  │───────►│ queue, groups, │
       │ correct/error/ │        │ reports, audit │
       │ not sure       │        └────────────────┘
       └────────────────┘
   Store: Postgres (attempts, traces, versions) · object storage (audio, retention policy)
   Every attempt records: model versions, dataset version, thresholds, cost.
```

**Rules that carry over:** pure scoring core; providers behind interfaces; no `bias_list`,
always verbatim; cache and cap every paid call; retries never pay twice; tests never call paid
APIs.

**New rules:**
- **Evidence sources are plug-ins** with one interface: `(audio, reference words) → per-word
  evidence`. The fusion step is the only place they meet.
- **Each attempt is reproducible**: model, aligner, threshold and passage-bank versions are
  stored with it.
- **Abstention is a first-class output**, not an error.

### Where things run

| Piece | Where | Why |
|---|---|---|
| VAD, quality check, pause finder | Device | Instant feedback ("move closer"), no cost |
| Prisma (REST and realtime) | Gnani cloud | Paid; cached by audio hash |
| Forced aligner, per-word verifier | Our server (CPU is enough for short parts; GPU optional) | Open models, no per-call cost |
| Evon | Self-hosted on vLLM, cloud GPU | 30B MoE does not fit this laptop (14 GB RAM, 4 GB GPU); content is generated offline in batches, so a short rented GPU session is enough |
| Timbre | Gnani cloud, then cached forever | Content-addressed cache already exists |

---

## 3. Workstream A — Scoring engine v2 (the core)

**Goal:** catch subtle misreads that Prisma hides, without raising false flags, and say "not
sure" where neither can be decided.

### A1. Forced alignment
- Align the reference text to the audio with an open CTC model: MMS forced aligner
  (`torchaudio` MMS_FA, romanised input) and AI4Bharat IndicConformer / IndicWav2Vec CTC heads
  as a second option. Compare both on the benchmark and keep the better per language.
- Output: start and end time for every reference word, alignment confidence, and gaps.
- Unlocks:
  - exact WCPM from speech time, not clip length
  - hesitation before each word, sounding-out, long pauses
  - the **2-second word clip** for the teacher review queue
  - time-anchored live read-along.
- Handles skipped words by letting the aligner allow "deletion" paths, then cross-checks with
  Prisma's transcript.

### A2. Per-word verification (GOP-style)
- For each aligned word, score the audio segment against the expected letter sequence and
  against a **confusion set** of near alternatives:
  - voicing (ಕ↔ಗ), aspiration (ಬ↔ಭ), place (ಟ↔ತ), nasal (ನ↔ಣ)
  - vowel length (ಇ↔ಈ), missing or wrong vowel sign (matra)
  - conjunct broken apart (ಕ್ಷ → ಕ ಷ)
  - visually confusable letters from the glyph-similarity table (B2)
- Score = log P(expected) − max log P(alternative), normalised by length. A small margin means
  "probably misread" or "not sure"; a large positive margin means "confident correct".
- Confusion sets come from script tables (C1), so no labelled data is needed.

### A3. Prosody and pauses
- From the alignment timings: pause before the word, word duration against expected duration,
  repeated segments, restarts.
- Detects letter-by-letter decoding ("ka … ma … la … kamala") and self-corrections, which
  matter for fluency even when the final word is right.

### A4. Fusion and calibration
- Inputs per word: Prisma op (correct / substituted / skipped / inserted), alignment
  confidence, verification margin, prosody features, spelling-variant flag.
- Start with a transparent rule table, then a small logistic model per language trained on the
  synthetic benchmark. **No deep model here**; it must be explainable word by word.
- Calibrate with isotonic or temperature scaling on a held-out synthetic split, then set two
  thresholds per language: `error` and `correct`, with `not sure` between them.
- Thresholds are chosen to hit a target false-flag rate first (do not wrongly tell a child
  they failed), then maximise catch rate.

### A5. Passage-level decisions
- WCPM with an uncertainty interval: count `not sure` words both ways.
- Band decision (below / at / above benchmark). If the interval crosses a band line, the
  attempt is marked **"needs a listen"** instead of being placed.

### Acceptance criteria (on the benchmark, not on children)

| Metric | Today | Target |
|---|---|---|
| Near-sound catch rate | 21% (8/39) | ≥ 60% |
| Skip / distant catch | ~95–100% | No regression |
| False-flag rate on correct words | 1–5% (loose) | ≤ 5% |
| Words marked "not sure" | ~0% (only spelling-variant `check`) | ≤ 10% |
| Band misclassification | not measured | ≤ 5% outside the "needs a listen" set |
| Calibration error (ECE) | not measured | ≤ 0.05 |
| Latency after a 20 s part | ~2–4 s | ≤ 4 s on CPU |

The targets are guesses until a baseline is measured, and will be reset after the first run;
the rule is that they are written down before the run, like `PREDICTIONS.md`.

### Rejected options
- **Fine-tuning our own ASR on synthetic audio.** It would learn the synthesiser, not children.
- **An LLM judging correctness.** Not repeatable, not explainable.
- **`bias_list` toward the passage.** It hides exactly the errors we want.

---

## 4. Workstream B — Synthetic data engine v2

**Goal:** a large, varied, exactly labelled set of "children reading with mistakes", built
without any child.

### B1. Error taxonomy (what we plant)

| Type | Example | Planting | Exists today |
|---|---|---|---|
| Skip word | — | drop word | ✓ |
| Distant substitution | another common word | swap from frequency list | ✓ |
| Half word | first part only | truncate at letter boundary | ✓ |
| Repeat | word said twice | duplicate | ✓ |
| Self-correction | wrong, then right | wrong + right | ✓ |
| Near-sound consonant | ಬ→ಭ, ग→क | sound-grid neighbour | ✓ |
| Vowel length | ಇ→ಈ | swap vowel sign | new |
| Missing / wrong vowel sign | कमल→कमाल | add/drop/swap matra | new |
| Visual confusion | ಬ↔ಒ, ம↔ய | glyph-similarity table | new |
| Conjunct breakdown | ಕ್ಷ said as ಕ…ಷ | split cluster, insert vowel | new |
| Letter-by-letter decoding | ka…ma…la…kamala | syllables with pauses, then word | new |
| First-letter guess | starts right, invents rest | keep first syllable, frequent completion | new |
| Line skip | whole line missing | drop a line in multi-line passages | new |
| Long hesitation | 1–3 s silence | insert silence | partial (halting audio) |
| Reversal | ನಾ→ಅನ | swap two syllables | new |

Each planted error carries: type, position, reference word, spoken form, and expected detector
behaviour (`should_flag`, `ok_to_abstain`).

### B2. Script resources (built once, reviewed by native speakers)
- **Sound grid** per script: consonants by place, voicing, aspiration and nasality; vowels by
  length.
- **Glyph-similarity table**: render every letter and common conjunct in two fonts, compute
  image similarity, keep the top confusions. Daniel reviews the Kannada and Tamil lists,
  Achindra the Hindi list.
- **Syllabifier**: split a word into aksharas (grapheme clusters) correctly, including
  conjuncts and Tamil pulli. Tested against hand-written cases.
- **Word frequency lists** from open corpora, for distant substitutions and passage difficulty.

### B3. Audio rendering
- **Several engines, not one**: Timbre v3.0 (13 voices, emotion tags, speed 0.85–1.15) plus
  open Indian-language TTS models (AI4Bharat Indic Parler-TTS, IndicF5). Using several engines
  avoids "Gnani audio transcribed by Gnani" blind spots and makes the hold-out test possible.
- **Halting reading**: chunks synthesised separately and joined with sampled pauses (exists),
  plus letter-by-letter decoding built the same way.
- **Child-voice proxy**: formant and pitch shift (vocal tract length perturbation), not only
  pitch; faster speaking-rate variation; occasional breathy or soft voice via Timbre tags.
- **Conditions**: classroom reverb (simulated rooms), classroom babble, fan noise, cheap phone
  mic response, 8 kHz phone band, AMR / Opus codecs (phone and WhatsApp), clipping, low volume.

### B4. Real adult voices with planted errors (only if the rules allow it)
- Open read-speech datasets with known text (for example AI4Bharat Kathbath) give real human
  voices. With forced alignment, splice errors into them: cut a word (skip), splice in the same
  speaker saying another word (substitution), duplicate a segment (repeat), stretch silences.
- **Gate:** the challenge rules say synthetic data only; the draft question to Gnani is in
  [GNANI_MESSAGES.md](GNANI_MESSAGES.md). Also check each dataset's licence. Adult voices are
  not children's data, so this does not break our own constraint.

### B5. Dataset management
- Versioned manifests (`dataset@vN`): every clip has text, plants, engine, voice, conditions,
  seed. Rebuilding from the manifest gives the same audio (cached).
- **Splits:** tune / calibrate / test, split by passage *and* by voice. One whole engine is
  held out of tuning and calibration entirely (idea 4).
- Credit budget: Timbre audio is cached forever; Prisma transcripts cached by audio hash. At
  the measured ~0.05–0.1 credits per short request, 20,000 clips through both models is about
  1,000–2,000 credits. Measure before each large build; the ledger cap stays.

---

## 5. Workstream C — The benchmark ("Akshara-Bench")

**Goal:** one command that scores any combination of evidence sources on the whole matrix, and
a public report Gnani and others can use.

- **Matrix:** language × error type × condition × engine (seen / held out) × voice × speed.
- **Metrics:**
  - per-type catch rate
  - false-flag rate on correct words
  - "not sure" rate
  - WCPM absolute error
  - band misclassification
  - calibration error
  - cost per attempt
  - latency
- **Systems compared:** Prisma alone (today), aligner alone, verifier alone, fused, plus open
  ASR baselines through the same interface.
- **Outputs:** `results/bench/<run>.json`, an HTML report with failure examples (audio, what was
  planted, what each layer said), and a short headline table in RESULTS.md.
- **CI gate:** the committed results must stay above the agreed lines (extends
  `test_eval_gate.py` and `check_numbers.py`).
- **Datasheet:** what the audio is and is not, which engines, which conditions, known gaps.
- **For Gnani:** a section that measures Prisma's language-model autocorrection directly
  (near-sound misreads turned into the reference word), with the clips. This supports the
  "assessment mode" proposal in section 13.

---

## 6. Workstream D — Learner model

**Goal:** turn word results into "what this child needs next", per script.

- **Skill graph per script:**
  - letters, then vowel signs on each consonant group
  - then common conjuncts
  - then word reading by length and frequency
  - then sentence reading, then passages
  Built from the B2 tables; Daniel and Achindra review the order for their languages.
- **Evidence mapping:** each word result touches the skills in that word (its aksharas, vowel
  signs, conjuncts). A `not sure` result counts as weak evidence; a teacher override counts as
  strong evidence.
- **Mastery estimate:** Bayesian Knowledge Tracing per skill. It is simple, explainable, and
  its parameters start from sensible defaults that a pilot can refit.
- **Placement:** a short adaptive test (letters → words → paragraph → story) mapped to ASER
  levels, stopping as soon as the level is clear.
- **Passage difficulty from text alone:**
  - length in aksharas
  - conjunct density
  - vowel-sign complexity
  - word frequency
  - sentence length
  Gives a difficulty score now, and is refitted with item response theory once real
  attempts exist.
- **Equated parallel forms** for pre/post assessment: passages matched on the difficulty
  features, so retests are not memorised.
- **Simulated learners for testing:** synthetic children with known skill profiles read
  synthetic passages (B engine). Check that placement finds their level and that mastery
  converges. This is the only way to test the learner model without children, and it says so.

---

## 7. Workstream E — Content engine (Evon)

**Goal:** endless, level-appropriate, culturally local reading material in three languages,
with every output checked by code.

- **Passage bank first:** StoryWeaver passages (with licence and source per book), tagged with
  the difficulty features, split into parts (exists).
- **Decodable practice from Evon:**
  - Input: language, the child's known skills, two to four target skills or words, length,
    theme.
  - Output: strict JSON (`title`, `sentences[]`, `target_words_used[]`).
  - **Validators (pure code):**
    - script check: only the target script
    - every akshara within known + target skills
    - all target words present
    - length and sentence-length limits
    - no repeated sentences
    - profanity / unsafe-word list
    - difficulty score in range
  - Retry up to N times with the validator's error message, then fall back to the bank.
- **Comprehension questions:** one literal question per passage, with expected answer keywords.
  The child answers aloud through Prisma; matching is keyword- and alignment-based, not an LLM
  judge.
- **Teacher insight lines:** short templated sentences in the teacher's language ("Ravi mixes
  up ಬ and ಭ — try these words"). Evon only fills slots; the claim comes from the learner
  model.
- **Quality control:**
  - automatic validator pass rate tracked per language
  - a fixed sample per batch reviewed by Daniel (Kannada, Tamil) and Achindra (Hindi)
  - review results logged, so we can say what share of Evon output passes a native speaker
- **Hosting:** vLLM on a rented GPU or a free notebook GPU; generation runs in offline batches,
  and outputs are stored in the bank, so the app never waits on Evon live.

---

## 8. Workstream F — Voice experience (Timbre)

- **One reading buddy:** a single Timbre voice and character that speaks all three languages.
  Emotion tags for encouragement (`<excited>`), softer tone after a struggle.
- **Model reading:** every bank passage pre-rendered at normal and slow speed.
- **Word help:** the word, then broken into aksharas, then the word again. Conjuncts get an
  extra step (ಕ್ + ಷ = ಕ್ಷ).
- **Child-free navigation:** every button and instruction has a spoken prompt; the child never
  needs to read UI text.
- **Teacher voice (optional, with consent):** clone the teacher's voice for model reading.
- **Cache:** content-addressed, never re-synthesised (exists for words; extend to everything).

---

## 9. Workstream G — Live read-along (Prisma realtime)

**Used for practice only; assessment stays on the batch pipeline.**

- Stream 16-bit PCM over Prisma's realtime WebSocket (partials need the undocumented
  `x-partials` header; sessions cap at 15 minutes).
- **Pointer tracking:** align each partial transcript incrementally to the passage to move a
  highlight. The partials feed the pointer only and never decide a score.
- **Stall help:** no pointer progress plus silence for about 3 s triggers the buddy to say the
  next word (pre-cached Timbre audio).
- **After the reading:** the recorded audio goes through the full scoring engine (A), so the
  live view and the final score never disagree for long.
- **Cost guard:** measure the streaming credit rate first; cap live seconds per child per day.

---

## 10. Workstream H — Channels

| Channel | For | How | Notes |
|---|---|---|---|
| PWA on a shared tablet | Classroom | Exists; add offline queue, fast profile switching, spoken navigation | Main channel |
| WhatsApp voice note | Home, parents | WhatsApp Cloud API; Opus → WAV; reply with a Timbre voice note and a one-line text | Needs a business number; codec added to the benchmark (B3) |
| Phone call | Basic phones | Gnani's Inya agent platform or the Pipecat / LiveKit plugins; buddy reads, child reads back, 8 kHz pipeline | Our phone-band results already match clean audio; confirm Inya's telephony access |
| Missed call | Lowest-cost start | Parent gives a missed call, system calls back | Common pattern in Indian public services |

All channels end in the same attempt pipeline and the same audit record.

---

## 11. Workstream I — Teacher and system product

- **Dashboard built around decisions, not charts:**
  - "Who needs me today?": children below band and attempts marked "needs a listen".
  - **Review queue:** each `not sure` word as a 2-second clip, with Correct / Wrong buttons
    (needs the aligner timings). Target: under 2 minutes of listening per class per round,
    measured on simulated classes.
  - **TaRL groups:** children grouped by level, with a suggested activity per group.
  - **Skill heatmap:** which letters and signs the class struggles with.
  - **Progress:** per child over time, on equated passages.
- **Overrides:** every teacher correction is stored as a label with who, when and why. This is
  the data flywheel for the day real use starts (with consent).
- **School and district view:** roll-ups by level and skill, NIPUN-style report export, an
  audit sample (random attempts with audio for spot checks).
- **Assessment rounds:** a teacher starts a round, the system assigns equated passages, tracks
  coverage, and closes the round with a report.

---

## 12. Workstream J — Trust, safety and privacy

- **DPDP Act 2023:** verifiable parental consent for anyone under 18; no tracking, behavioural
  monitoring or targeted ads aimed at children. Design for it from the start:
  - consent records per child
  - pseudonymous IDs
  - audio retention off by default, or a short window for review
  - deletion on request
  - data stored in India
- **Honesty in the product:** each result shows what is reliable and what is not (exists as the
  notice); `not sure` is visible; the benchmark's limits are linked.
- **Model card and datasheet** for the scoring engine and the benchmark.
- **Child safety in content:** Evon validators plus a word blocklist; no free-form chat with
  children.
- **Security basics:**
  - auth for teachers and admins, org-scoped data
  - per-org rate limits and spend caps
  - signed audio URLs, audit log of admin actions

---

## 13. Workstream K — Platform and engineering

- **Layout:**

  | Module | Holds |
  |---|---|
  | `core/` | pure: text, align, parts, plant, script tables, difficulty, fusion rules |
  | `evidence/` | aligner, verifier, prosody, Prisma |
  | `learner/` | skill graph, BKT, placement |
  | `content/` | bank, Evon client, validators |
  | `channels/` | channel adapters |
  | `service/` + `api/` | the service layer and HTTP API |

  Each is one person's to explain.
- **Storage:** SQLite → Postgres when multi-tenant; audio in object storage with lifecycle
  rules.
- **Jobs:** attempts processed on a queue (the scoring engine is heavier than one Prisma call);
  idempotency stays.
- **Versioning:** model, threshold, dataset and bank versions recorded per attempt; re-scoring
  old attempts with a new engine is a supported job.
- **Observability:**
  - per-attempt trace (exists)
  - per-org cost meter
  - drift signals that need no labels: "not sure" rate, mean verification margin,
    audio-quality failures, aligner confidence
- **Testing:**
  - property tests for the scorer and planter
  - golden files for script tables
  - benchmark regression in CI
  - simulated-class tests for the learner model
  - axe and bundle budget for the web (exist)
- **Low-end performance:** target a 2 GB Android phone on a 2G or 3G connection. Passages and
  audio are pre-fetched; uploads are compressed and resumable.
- **UI language:** interface strings in Kannada, Tamil and Hindi, reviewed by native speakers.

---

## 14. Workstream L — Business

**Customers, in order of fit**
1. **NGOs running literacy programmes** (Pratham-style TaRL partners, Room to Read and others):
   they already assess children by hand and need faster, auditable measurement.
2. **State foundational-literacy missions** (NIPUN Bharat funding): large-scale assessment
   rounds, where audit trails and cost per child matter most.
3. **CSR funders** who need impact numbers for their programmes.
4. **Low-fee private schools**: a per-student subscription for assessment plus practice.
5. **Parents**: a free WhatsApp tier, which also spreads the product.

**Value proposition**
- **Time:** a teacher's one-to-one listening for a class becomes a short review queue.
- **Trust:** every score has audio and a trace; spot checks are one click.
- **Action:** groups and target skills, not just a number.
- **Reach:** works on a shared tablet, WhatsApp or a basic phone, offline-first.

**Unit economics (structure; fill in with measured rates)**
- Cost per assessment = Prisma seconds × rate + Timbre cache misses + aligner/verifier compute
  + storage.
- Content cost is amortised: Evon passages and Timbre audio are generated once and reused
  across every child.
- Price per child per year must beat the cost of a trained assessor's time per child; the
  plan should show that comparison with stated assumptions.

**Competition and gap**
- Google Read Along does not support Kannada.
- Wadhwani AI's government oral reading fluency tool covers Gujarati, with Hindi and Marathi
  in progress (as of our Oct 17 research).
- Human-run assessments (ASER, state surveys) are slow, expensive and hard to audit.
- **Gap:** Kannada and Tamil, auditable evidence, assessment linked to practice, and basic-phone
  reach.

**Moat**
- the benchmark and synthetic data engine
- script resources reviewed by native speakers
- a calibrated difficulty model
- teacher override data once live
- distribution through partners

**For Gnani (the partnership pitch)**
- A showcase in education built on all three models.
- A product idea backed by our data: an **"assessment mode"** for Prisma that limits
  language-model autocorrection, or returns word timings and confidences. Reading, language
  learning and speech therapy all need it.
- Evon running self-hosted for content: a public example of the "sovereign stack" working.

**Risks**

| Risk | Mitigation |
|---|---|
| Synthetic-to-real gap is large | Held-out engine estimate; abstention; shadow mode before any decision is automated |
| Children's speech much harder than the proxy | Thresholds per age band, recalibrated in the pilot; "needs a listen" route |
| Government sales cycles are slow | Start with NGOs; WhatsApp tier for reach |
| Name clash: Akshara Foundation, an established Bengaluru education nonprofit | Decide: rename, or approach them as a partner |
| Prisma behaviour changes | Benchmark in CI catches it; evidence sources are swappable |

---

## 15. Readiness for real data (the pilot kit)

None of this needs real data to build; all of it is needed the day real data arrives.

- **Shadow mode:** the teacher marks words by hand while the system scores silently. The
  agreement report comes out of the same benchmark code.
- **Pre-registered pilot protocol:** written before any pilot, like `PREDICTIONS.md`. It
  covers:
  - questions, metrics and sample size
  - what counts as success
  - which thresholds are refitted, and which are frozen
- **Calibration job:** refit fusion thresholds, BKT parameters and passage difficulty from
  pilot data with one command; compare before/after on the synthetic benchmark to catch
  over-fitting.
- **Consent and ethics pack:** parent consent form in three languages, data handling summary,
  retention policy.
- **What stays unknown until then, stated plainly:**
  - real children's accuracy
  - the size of the synthetic-to-real gap
  - final thresholds
  - whether practice improves reading

---

## 16. Order of work and exit criteria

No dates; each phase ends when its exit check passes.

| Phase | Builds | Exit check |
|---|---|---|
| **1. Foundations** *(built 2026-10-24; waiting on native review)* | Script tables and syllabifier (B2), error taxonomy v2 (B1), dataset manifests and splits (B5) | Native review of tables signed off; planter tests pass; dry-run benchmark runs end to end |
| **2. Evidence** *(done 2026-10-24; [results](RESULTS.md#checking-each-word-against-the-audio-phase-2))* | Forced aligner (A1), verifier (A2), prosody (A3) behind the evidence interface | Each source scored alone on the benchmark; results and predictions committed |
| **3. Decisions** | Fusion, calibration, three states, band decisions (A4–A5); Akshara-Bench report (C) | Acceptance table in section 3 met on the held-out engine, or the gap explained |
| **4. Tutor** | Skill graph, BKT, placement, difficulty model (D); Evon content with validators (E); buddy voice (F) | Simulated learners placed correctly; Evon validator pass rate and native-review rate recorded |
| **5. Teacher** | Review queue with word clips, TaRL groups, heatmap, rounds, reports, overrides (I) | Simulated class: review time per round measured against target |
| **6. Live and channels** | Realtime read-along (G); WhatsApp and phone (H) | Streaming cost measured; codec conditions added to the benchmark |
| **7. Platform and trust** | Queue, Postgres, versioning, auth, consent, retention, observability (J, K) | Re-scoring old attempts works; consent and deletion flows tested |
| **8. Pilot kit** | Shadow mode, protocol, calibration job (15) | A dry run of the whole pilot on simulated data |

Phases 1–3 matter most: they turn the project's known weakness into its main result.

**What Phase 2 changed for Phase 3.** The check works in Hindi: on audible subtle mistakes it catches 20 of 22, against 11 for Prisma. In Kannada and Tamil it does not yet beat Prisma, because long, correctly read words also score low. About half the planted subtle mistakes are probably not audible in the synthetic audio. So Phase 3 should:
1. Stop counting inaudible mistakes against the system. Keep the planted-mistake check where a second model confirms the change was rendered, and report audible and all mistakes separately.
2. Score the margin per changed letter, not per frame of the whole word, so a one-letter change in a long Kannada or Tamil word is not diluted.
3. Make the fusion step use agreement: a word that both Prisma and the check doubt is much more likely wrong than one only the check doubts.
4. Bring the model's latency under real time (GPU, or a smaller CTC model) before live read-along.

### Who does what

- **Code, tests, benchmark and reports:** written with AI coding tools, reviewed by both of us.
- **Achindra:** decisions, Hindi review, the scoring and benchmark design, business section.
- **Daniel:** Kannada and Tamil review (script tables, glyph confusions, skill order, Evon
  samples), the web app and teacher product decisions.
- **Review gates (human, mandatory):** script tables, skill graph order, Evon samples,
  thresholds, every number that goes into a public doc.

---

## 17. Decisions needed from you

1. **Evon hosting:** this laptop cannot run it (14 GB RAM, 4 GB GPU). Options: rented GPU
   (Modal or similar) for batch generation, or a free notebook GPU. Which one?
2. **Real adult voices (B4):** ask Gnani whether open adult read-speech data is allowed (draft
   exists), or stay strictly synthetic?
3. **Name:** keep "Akshara" despite Akshara Foundation, or rename?
4. **Channels:** which of WhatsApp and phone matter most to the story? WhatsApp needs a business
   number; phone needs Inya access.
5. **Scope of the teacher product:** classroom only, or district roll-ups too?
