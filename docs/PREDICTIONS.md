# Predictions, written before the run

## Halting-audio test (written Oct 20, before any halting clip exists)

Setup: 45 open passages (15 per language) that contain a near-sound or distant swap. Each is read in chunks of 3 words, synthesised separately and joined with 0.35 s of silence, like a halting reader. The same audio is transcribed two ways: **whole** (one Prisma call per clip) and **chunked** (cut at pauses found in the audio, one call per piece, transcripts joined). Both are scored against the same planted mistakes.

1. Near-sound swaps are caught more often chunked than whole, by at least 10 percentage points.
2. Distant swaps and skips change little (within 5 points).
3. The chunked pass raises the false-flag rate, but by no more than 3 points over whole.
4. Chunking is **not** a clear win in Tamil, where short fragments may be recognised less reliably.

If 1 fails, we report that chunking does not help and why. If 3 fails, the mitigation costs too much accuracy and we say so. Numbers will be reported with intervals, and the sample (about 20 near-sound swaps per condition) is small enough that a 10-point difference may not be statistically reliable. We will say that too.

### Addendum, written Oct 20 before the halting run
The isolated-word control (`scripts/isolated_control.py`) found that Prisma returns the original word for 18 of 39 near-sound non-words even with no sentence around them, and the read non-word for only 4. So sentence context is not the only cause, and prediction 1 may fall short. We cannot tell whether the voice or the transcriber is responsible. Predictions 1 to 4 stand as written and will be judged as written.
