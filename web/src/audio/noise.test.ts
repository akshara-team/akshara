import { describe, expect, it } from "vitest";
import { NOISY_ROOM_DB, clipNoise, levelDb, meterValue, roomVerdict } from "./noise";

const RATE = 16000;

function tone(seconds: number, amp: number): Float32Array {
  const pcm = new Float32Array(Math.round(RATE * seconds));
  for (let i = 0; i < pcm.length; i++) pcm[i] = amp * Math.sin((2 * Math.PI * 220 * i) / RATE);
  return pcm;
}

/** Steady hiss at a given level, from a fixed seed so the test never flakes. */
function hiss(seconds: number, amp: number): Float32Array {
  let seed = 7;
  const pcm = new Float32Array(Math.round(RATE * seconds));
  for (let i = 0; i < pcm.length; i++) {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    pcm[i] = amp * (seed / 2 ** 30 - 1);
  }
  return pcm;
}

/** Words (tone bursts) with pauses between, over a background. */
function reading(background: Float32Array): Float32Array {
  const out = Float32Array.from(background);
  const word = tone(0.4, 0.3);
  for (let start = 0; start + word.length < out.length; start += Math.round(RATE * 0.8)) {
    for (let i = 0; i < word.length; i++) out[start + i] += word[i];
  }
  return out;
}

describe("noise", () => {
  it("measures level in dB below full scale", () => {
    expect(levelDb(tone(0.1, 1))).toBeCloseTo(-3, 0); // a full-scale sine is about -3 dB
    expect(levelDb(new Float32Array(100))).toBe(-100);
    expect(meterValue(-80)).toBe(0);
    expect(meterValue(0)).toBe(1);
  });

  it("calls a reading in a quiet room quiet", () => {
    expect(clipNoise(reading(hiss(4, 0.001))).verdict).toBe("quiet");
  });

  it("calls a reading over loud chatter noisy", () => {
    const r = clipNoise(reading(hiss(4, 0.1)));
    expect(r.floorDb).toBeGreaterThan(NOISY_ROOM_DB);
    expect(r.verdict).toBe("noisy");
  });

  it("judges a room from the typical level, so one bang does not count", () => {
    expect(roomVerdict([-60, -58, -61, -10, -59])).toBe("quiet");
    expect(roomVerdict([-25, -28, -30, -27])).toBe("noisy");
    expect(roomVerdict([])).toBe("quiet");
  });
});
