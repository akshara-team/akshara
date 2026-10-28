import { levelDb } from "./noise";

export type Meter = {
  /** The level right now, in dB below full scale. */
  level: () => number;
  close: () => void;
};

/** Live level of a microphone stream. Null where the browser has no Web Audio. */
export function openMeter(stream: MediaStream): Meter | null {
  const Ctx = typeof window !== "undefined" ? window.AudioContext : undefined;
  if (!Ctx) return null;
  try {
    const ctx = new Ctx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    return {
      level() {
        analyser.getFloatTimeDomainData(buf);
        return levelDb(buf);
      },
      close() {
        void ctx.close().catch(() => {});
      },
    };
  } catch {
    return null;
  }
}

/** The microphone as the recorder opens it, so a check hears what a recording would. */
export const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: { channelCount: 1, echoCancellation: true, autoGainControl: true },
};
