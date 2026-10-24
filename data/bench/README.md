# Benchmark data

Everything here is synthetic. No real children, no real voices beyond Timbre's.

| File | What it is | Built by |
|---|---|---|
| `passages_v2.jsonl` | 90 passages (30 per language) with the second-set mistake types: vowel length, vowel sign, look-alike letter, conjunct read apart, reversal, first-akshara guess, sounding out, long pause | `scripts/build_bench_passages.py` |
| `manifest-v1.jsonl` | 480 clips: the open study set in 4 conditions (360), the repeat/self-correction set (30), and the second set (90, audio not rendered yet) | `scripts/build_manifest.py` |

## A clip record

`clip_id`, `passage_id`, `lang`, `reference` (what the child should read), `read_as` (what
the synthetic reader says), `errors` (each planted mistake: index, type, what was said, what
changed), `engine`, `voice`, `speed`, `conditions` (audio degradations, in order), `audio`
(path, may not exist on every machine since WAVs are git-ignored), `report` (committed study
report holding the transcript, if any), `split`, `set`.

- **Voices** for existing audio are read from the TTS logs in `results/`. **Speed** was not
  logged for those clips, so it is empty.
- **Splits** (`tune` / `calibrate` / `test`, 60/20/20) are decided by a hash of the passage
  family, so a passage and its variants (`-d`, `-v2`) are always in the same split. Hindi had
  only 41 eligible passages, so the second set reuses first-set Hindi text with new mistakes;
  the family rule keeps those in their original split.
- **`holdout`** is for clips from a speech engine never used for tuning or calibration. It is
  empty until a second engine renders clips (`HOLDOUT_ENGINES` in `src/akshara/dataset.py`).

## Run it

```bash
uv run python scripts/bench.py --dry-run         # planted text as transcript: must be perfect
uv run python scripts/bench.py --from-reports    # committed transcripts: reproduces RESULTS.md
```

Mistake types, and whether each should be flagged or may be marked "not sure":
`TAXONOMY` in `src/akshara/core/plant.py`, and the table at the top of
[docs/review/SCRIPT_TABLES.md](../../docs/review/SCRIPT_TABLES.md).
