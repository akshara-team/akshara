# Evals

We publish these numbers in the README. Few entries will show real measurements; this is where we stand out.

## What we measure

| Metric | How | Target |
|---|---|---|
| **Mistake catch rate** | Planted mistakes flagged ÷ planted mistakes ([GO_NO_GO.md](GO_NO_GO.md)) | ≥ 70%, per language |
| **False-flag rate** | Correct words flagged ÷ correct words | ≤ 10%, per language |
| **WCPM error** | Our WCPM vs hand-counted WCPM on the same clip | Within ±5 WCPM |
| **Story validity** | Evon stories that pass the JSON + length + language-script check on first try | Report it |
| **Story level fit** | Avg words per sentence, share of words outside a level word list | Report it |
| **Latency** | Time from end of reading to score shown, split by stage (upload, STT, scoring) | < 3 s |
| **Credits per attempt** | STT seconds + TTS characters, from our own usage log | Report it |

All numbers are split by language: Hindi, Kannada, Tamil.

## Test sets

| Set | Where | Notes |
|---|---|---|
| Go/no-go passages | `data/go_no_go/` | Our own adult voices with planted mistakes |
| Noisy subset | same, recorded on phone mic in a noisy room | Shows how it holds up in a classroom |
| Synthetic "child" readings | Timbre-generated at slow speed with planted mistakes | Cheap to scale; label clearly as synthetic |

## In CI

- Scorer unit tests run on every push (`.github/workflows/ci.yml`).
- The go/no-go dry run runs in CI to catch broken passage files.
- The live eval uses credits, so it runs by hand, and its report is committed to `results/`.
