# Running Evon for practice sentences

Evon v3.3 writes the practice sentences a teacher approves on the **Sentences** screen. It is
open (Apache 2.0), so it costs no Gnani credits, but it is too big for a laptop: 30B parameters
(about 3.5B active per token), a Nemotron hybrid Mamba-Transformer MoE (`nemotron_h`). It runs
once, in a batch, and the app reads the saved results; the app never waits on Evon.

The batch is small: about 20 skills per language that the stories do not cover, a few replies
each, so a few hundred short requests. Expect well under an hour on one GPU.

**Not yet tried by us end to end.** The commands below come from the model card and the GGUF
repository. Check the model card first if one fails.

## Option A: a rented GPU with vLLM (the model card's way)

A GPU with 80 GB (A100 80GB or H100) on RunPod, Modal, Lambda or similar, for about an hour.

```bash
pip install -U "vllm>=0.12.0"
vllm serve gnani/gnani-evon-v3.3 \
  --served-model-name model --max-model-len 8192 --port 8000 \
  --trust-remote-code --reasoning-parser nano_v3
```

The model card's command uses `--max-model-len 131072` and tool-calling flags; neither is
needed here (our prompts are short, and Evon is not asked to use tools).

## Option B: free, on Kaggle (2× T4, 32 GB) with llama.cpp

Uses a community GGUF build, not Gnani's own: `luminenio/gnani-evon-v3.3-30B-A3B-GGUF`.
`IQ4_XS` (18.4 GB) fits across the two T4s.

```bash
# in a Kaggle notebook with "GPU T4 x2" and internet on
huggingface-cli download luminenio/gnani-evon-v3.3-30B-A3B-GGUF \
  gnani-evon-v3.3-30B-A3B-IQ4_XS.gguf --local-dir /kaggle/working
# a llama.cpp build with CUDA and Nemotron-H support (a recent release)
./llama-server -m /kaggle/working/gnani-evon-v3.3-30B-A3B-IQ4_XS.gguf \
  --alias model -c 8192 -ngl 99 --split-mode layer --port 8000 --jinja
```

Run the batch from the notebook itself (clone the repo there) so the server can stay on
`localhost`. A 4-bit build is a little weaker than the full model; the code checks catch what
breaks, and the pass rate is reported.

## Run the batch

```bash
uv run python scripts/evon_sentences.py --dry-run           # targets and prompts, no calls
EVON_BASE_URL=http://localhost:8000/v1 uv run python scripts/evon_sentences.py
uv run python scripts/build_sentences.py                    # copy to the web app's demo mode
```

What it does, per language: picks the skills (letters, vowel signs, conjuncts) that no story
sentence covers, asks Evon for three short sentences using example words from the stories, and
checks each one in code (`src/akshara/content/sentences.py`): only the language's script, 3–8
words and at most 60 characters, uses the target sound, and every word decodable at that point
in the curriculum. A failing reply is answered with the reasons, up to three times. Settings
follow the model card: temperature 0.6, top_p 0.95, thinking off.

Outputs:

- `data/practice/sentences.jsonl`: sentences that passed. Commit it. Each still needs a
  teacher's approval in the app before any child sees it.
- `results/evon_sentences_report.json`: per language, replies, sentences, how many passed and
  why the rest failed. This is the number to quote: what share of Evon's output survives the
  checks.

## Before the demo

Have a native speaker read the passing sentences (Daniel for Kannada and Tamil, Achindra for
Hindi), the same way as the child text. The approval screen is that review: approve in the app,
or reject what reads wrong.
