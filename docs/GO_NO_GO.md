# Week-1 Go/No-Go Test

**Question:** when someone misreads or skips a word, does Prisma's transcript show the mistake, or does it "fix" it?

If Prisma hides mistakes, the tutor can't work and we switch to the runner-up idea.

## Pass criteria (per language)

| Metric | Pass | Meaning |
|---|---|---|
| **Catch rate** | ≥ 70% | Share of planted mistakes the scorer flags |
| **False-flag rate** | ≤ 10% | Share of correctly read words the scorer wrongly flags |

Decide per language. If two of three pass, build it for those languages.

## Steps

### 1. Write the passages (Partner: Kannada, Tamil · Achindra: Hindi)

Add 20 passages per language to `data/go_no_go/passages.jsonl`. Copy the format from `passages.example.jsonl`:

```json
{"id": "hi-001", "lang": "hi-IN", "reference": "राम सुबह जल्दी उठा और बाग़ में गया।",
 "read_as": "राम सुबह जल्दी उठा बाग़ में गया।",
 "errors": [{"index": 4, "type": "skip"}]}
```

- `reference`: the passage as written. Class 2–3 level, 15–40 words, short sentences.
- `read_as`: exactly what the reader will say, mistakes included.
- `errors`: each planted mistake. `index` is the 0-based word position in `reference` (punctuation doesn't count as a word). `type` is `skip` or `substitution`.
- Plant 2–3 mistakes per passage. Mix the kinds children actually make: skipping a short word, swapping a similar-looking word, reading only the start of a long word, changing a vowel sign.
- Leave some passages with no mistakes, to measure false flags.

Run `uv run python scripts/go_no_go.py --dry-run` to check your indexes. In dry-run mode `read_as` stands in for the transcript, so every passage should score 100% catch and 0% false flags. If one doesn't, its `index` values are wrong.

### 2. Record

- Read `read_as` aloud, at a child-like slow pace. Each clip **under 30 seconds**.
- Save as WAV in `data/go_no_go/audio/<id>.wav` (any sample rate; mono preferred).
- **Adults only, our own voices.** No children, no one else's recordings.
- Record a few on a phone mic in a noisy room too. Classrooms aren't quiet.

### 3. Check the credit cost first

Before the full run, transcribe one clip and check the dashboard:

```bash
uv run python scripts/go_no_go.py --only hi-001
```

Write the cost in [GNANI_API.md](GNANI_API.md#credit-rates). 60 clips × ~20 s ≈ 20 minutes of audio.

### 4. Run it

```bash
uv run python scripts/go_no_go.py
```

Transcripts are cached in `results/transcripts/`, so re-running costs nothing. The script prints catch and false-flag rates per language and writes `results/go_no_go_report.json`.

### 5. Decide

Write the result and the decision at the bottom of this file and in [WORKLOG.md](WORKLOG.md).

## Result

*Not run yet.*

| Language | Passages | Planted mistakes | Catch rate | False-flag rate | Pass? |
|---|---|---|---|---|---|
| Hindi | | | | | |
| Kannada | | | | | |
| Tamil | | | | | |

**Decision:**
