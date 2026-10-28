/**
 * How noisy a room or a recording is, from sound levels alone. Pure, so it is tested on made-up
 * signals. The thresholds are first guesses, not calibrated on real classrooms: in the study,
 * pink noise at 5 dB signal-to-noise changed the catch rate little (docs/RESULTS.md), so these
 * only warn about rooms clearly louder than that. They never stop a child from reading.
 */

/** Background louder than this (dB below full scale) is a noisy room. */
export const NOISY_ROOM_DB = -35;
/** Speech less than this many dB above the background is hard to hear. */
export const MIN_SPEECH_ABOVE_NOISE_DB = 8;

const FLOOR = -100;

/** Level of a block of samples, in dB below full scale (0 is the loudest possible). */
export function levelDb(samples: Float32Array): number {
  if (samples.length === 0) return FLOOR;
  let sum = 0;
  for (const s of samples) sum += s * s;
  const rms = Math.sqrt(sum / samples.length);
  return rms > 0 ? Math.max(FLOOR, 20 * Math.log10(rms)) : FLOOR;
}

/** Level for the meter, 0 to 1: -60 dB and below is empty, -10 dB and above is full. */
export function meterValue(db: number): number {
  return Math.min(1, Math.max(0, (db + 60) / 50));
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? FLOOR;
}

export type Verdict = "quiet" | "noisy";

/** A room heard for a moment before reading: the typical level is the background. */
export function roomVerdict(levels: number[]): Verdict {
  if (levels.length === 0) return "quiet";
  return percentile(levels, 0.5) > NOISY_ROOM_DB ? "noisy" : "quiet";
}

/**
 * A finished recording: the quietest tenth of 30 ms frames is the background (pauses between
 * words), the loudest tenth is the reading.
 */
export function clipNoise(pcm: Float32Array, rate = 16000): {
  floorDb: number;
  speechDb: number;
  verdict: Verdict;
} {
  const size = Math.max(1, Math.round(rate * 0.03));
  const levels: number[] = [];
  for (let i = 0; i + size <= pcm.length; i += size) levels.push(levelDb(pcm.subarray(i, i + size)));
  const floorDb = percentile(levels, 0.1);
  const speechDb = percentile(levels, 0.9);
  const noisy = floorDb > NOISY_ROOM_DB || speechDb - floorDb < MIN_SPEECH_ABOVE_NOISE_DB;
  return { floorDb, speechDb, verdict: levels.length && noisy ? "noisy" : "quiet" };
}
