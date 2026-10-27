# Rendering the held-out engine (for Daniel)

**Why:** every benchmark clip so far is read by Timbre, and every threshold was set on Timbre. This run reads the 47 `test` passages again with a different, open voice engine (AI4Bharat's Indic Parler-TTS). It checks whether the Phase 3 results hold for a voice the system has never heard. The predictions are already committed ([PREDICTIONS.md](PREDICTIONS.md), "Held-out engine"). Nothing in this run changes a threshold.

**What it costs**
- Disk: about 4 GB for the model download (one time), plus about 50 MB of audio. Set `HF_HOME` in `.env` to put the model on a drive with space. Delete that folder afterwards to get the space back.
- Memory: about 4 GB of RAM while rendering. An NVIDIA GPU is faster but not needed.
- Time: about an hour on a GPU, a few hours on CPU (47 clips).
- Credits: rendering is free (local). Step 5 makes **188 Prisma calls** (about 10–20 credits), through the usual ledger cap.

## Steps

All commands run from the repo root on branch `feat/evidence`.

**0. Set up**
```
git pull
uv sync
```
The model page is <https://huggingface.co/ai4bharat/indic-parler-tts>. If it asks you to accept terms, accept, make a read token at <https://huggingface.co/settings/tokens>, and add it to `.env` as `HF_TOKEN=...`. Never commit `.env`.

**1. See what will be rendered (no download)**
```
uv run python scripts/render_holdout.py --dry-run
```
It should say `47 clips to render`.

**2. Render two clips and listen to them**
```
uv run --no-project --with-requirements scripts/holdout_requirements.txt python scripts/render_holdout.py --limit 2
```
The first run installs Parler-TTS into a separate throwaway environment (it needs an older `transformers` than the project) and downloads the model. Listen to the two files in `data/bench/audio/indic-parler-tts/`. They should be a clear reading of the passage in the right language. If they are not, stop and tell Achindra.

**3. Render the rest**
```
uv run --no-project --with-requirements scripts/holdout_requirements.txt python scripts/render_holdout.py | tee results/holdout_tts.log
```
Clips already on disk are skipped, so if it stops you can rerun it. Lines ending `CHECK: unusual length` are worth a listen. Note down any clip that is clearly broken (wrong language, cut off, babbling), but **do not re-render or delete it**: the exclusion rules were fixed in advance.

**4. Make the phone, noise and child-pitch copies (local, free)**
```
uv run python scripts/make_variants.py data/bench/audio/indic-parler-tts data/bench/audio/indic-parler-tts/variants
```

**5. Get Prisma transcripts (credits)**

First check the cap: `AKSHARA_MAX_CALLS` in your `.env` must be at least the line count of `results/ledger.jsonl` plus 190. Then transcribe one clip and check its cost:
```
uv run python scripts/go_no_go.py --passages data/bench/passages_holdout.jsonl --audio-dir data/bench/audio/indic-parler-tts --variant holdout_clean --only sw-50302
```
Then the four full runs. Transcripts are cached, so the clip you just did is not paid for again:
```
uv run python scripts/go_no_go.py --passages data/bench/passages_holdout.jsonl --audio-dir data/bench/audio/indic-parler-tts --variant holdout_clean
uv run python scripts/go_no_go.py --passages data/bench/passages_holdout.jsonl --audio-dir data/bench/audio/indic-parler-tts/variants/phone8k --variant holdout_phone8k
uv run python scripts/go_no_go.py --passages data/bench/passages_holdout.jsonl --audio-dir data/bench/audio/indic-parler-tts/variants/noise5 --variant holdout_noise5
uv run python scripts/go_no_go.py --passages data/bench/passages_holdout.jsonl --audio-dir data/bench/audio/indic-parler-tts/variants/child4 --variant holdout_child4
```

**6. Point the manifest at the transcripts**
```
uv run python scripts/build_manifest.py
uv run pytest
```

**7. Send it back**
- Commit and push: `results/go_no_go_holdout_*.json`, `results/holdout_tts.log`, `results/ledger.jsonl`, `data/bench/manifest-v1.jsonl`. The ledger is append-only. If it conflicts on merge, keep both sides' lines.
- Audio is git-ignored. Zip `data/bench/audio/indic-parler-tts/` (all of it, variants included) and share it. Achindra unzips it in the same place and runs the per-word check and `scripts/fusion_report.py --test --holdout`.
- Add a line to [WORKLOG.md](WORKLOG.md), and note any clips that sounded broken.
