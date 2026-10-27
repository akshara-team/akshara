import { MIN_RECORDING_S, SILENCE_PEAK, checkClip, encodeWav, wavSeconds } from "./mock";

const RATE = 16000;

/** jsdom's Blob has no arrayBuffer(); FileReader works there and in browsers. */
function bytes(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as ArrayBuffer);
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(blob);
  });
}

function clip(seconds: number, amp: number): Float32Array {
  const pcm = new Float32Array(Math.round(RATE * seconds));
  for (let i = 0; i < pcm.length; i++) pcm[i] = amp * Math.sin((2 * Math.PI * 220 * i) / RATE);
  return pcm;
}

describe("checkClip", () => {
  it("accepts a normal reading", () => {
    expect(checkClip(clip(3, 0.3))).toBeNull();
  });
  it("flags a muted microphone as silent", () => {
    expect(checkClip(clip(3, SILENCE_PEAK / 4))).toBe("silent");
    expect(checkClip(new Float32Array(RATE * 3))).toBe("silent");
  });
  it("flags a tap-tap as too short", () => {
    expect(checkClip(clip(MIN_RECORDING_S / 2, 0.3))).toBe("short");
    expect(checkClip(new Float32Array(0))).toBe("short");
  });
});

describe("encodeWav", () => {
  it("writes a 16 kHz mono 16-bit header the backend reads", async () => {
    const wav = encodeWav(clip(1, 0.5));
    const view = new DataView(await bytes(wav));
    const tag = (o: number) => String.fromCharCode(...[0, 1, 2, 3].map((i) => view.getUint8(o + i)));
    expect(tag(0)).toBe("RIFF");
    expect(tag(8)).toBe("WAVE");
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(RATE);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(RATE * 2);
    expect(wav.type).toBe("audio/wav");
  });
});

describe("wavSeconds", () => {
  it("reads the length back from the encoded size", () => {
    expect(wavSeconds(encodeWav(clip(7.5, 0.3)))).toBeCloseTo(7.5, 3);
  });
});
