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

### 1. Write the passages (Daniel: Kannada, Tamil · Achindra: Hindi)

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

### 2. Record (synthetic)

Timbre reads each passage's `read_as`, mistakes included, so no one has to record by hand:

```bash
uv run python scripts/make_test_audio.py --dry-run      # preview, no calls
uv run python scripts/make_test_audio.py --only hi-101  # one clip, to check credit cost
uv run python scripts/make_test_audio.py                # all passages
```

- Clips are written to `data/go_no_go/audio/<id>.wav` as mono 16 kHz, already **under 30 seconds**.
- A slow voice (`--speed 0.85`) reads closer to a halting reader.
- `scripts/record.py` records with a microphone instead (adults only, our own voices) if a
  real voice is ever wanted.

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

*Run 2026-10-21 on synthetic Timbre clips, 12 Kannada + 12 Tamil (`results/go_no_go_kn_ta.json`). Hindi not run.*

| Language | Passages | Planted mistakes | Catch rate | False-flag rate | Pass? |
|---|---|---|---|---|---|
| Hindi | — | — | — | — | not run |
| Kannada | 12 | 20 | 100% | 1% | Yes |
| Tamil | 12 | 20 | 95% | 5% (loose) / 11% (strict) | Yes (loose) |

**Decision:** Go for Kannada and Tamil. Audio is synthetic (Timbre reads `read_as`), so this
measures the transcriber, not a classroom. Kannada passes in both scoring modes. Tamil passes
under loose scoring; its strict false-flag rate (11%) is one word over the line and comes only
from spelling variants (trailing ள்/ல், க், word merging), not passage errors. One genuine miss:
ta-102, where the near-sound swap மலை came back as the correct மழை — the hidden-misread
behaviour this test exists to measure.
