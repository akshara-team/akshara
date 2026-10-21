import { isLang, type Lang } from "../theme/script";
import type { Attempt, Passage, WordOut } from "./types";

/**
 * Turns one recorded clip into a WAV blob the backend accepts: mono, 16 kHz,
 * 16-bit PCM. Same approach as the original screen in
 * `src/akshara/api/static/index.html`, which is the proven path.
 */
export async function toWav16k(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  await ctx.close();

  const frames = Math.ceil(decoded.duration * 16000);
  const off = new OfflineAudioContext(1, frames, 16000);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const pcm = (await off.startRendering()).getChannelData(0);

  const view = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const str = (offset: number, s: string) =>
    [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  str(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  str(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, pcm.length * 2, true);
  pcm.forEach((v, i) =>
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 32767, true),
  );
  return new Blob([view], { type: "audio/wav" });
}

export type RecorderState = "idle" | "requesting" | "recording" | "error";

export type Recorder = {
  state: RecorderState;
  error: string | null;
  start: () => Promise<void>;
  /** Stops and resolves the recorded clip as 16 kHz WAV. */
  stop: () => Promise<Blob>;
};

/** Thin wrapper over MediaRecorder that hands back a backend-ready WAV. */
export function createRecorder(): Recorder {
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: BlobPart[] = [];
  let stopped: Promise<void> = Promise.resolve();

  return {
    state: "idle",
    error: null,

    async start() {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream = media;
      chunks = [];
      recorder = new MediaRecorder(media);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      stopped = new Promise<void>((resolve) => {
        if (recorder) recorder.onstop = () => resolve();
      });
      recorder.start();
    },

    async stop() {
      if (!recorder) throw new Error("not recording");
      recorder.stop();
      await stopped;
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      recorder = null;
      return toWav16k(new Blob(chunks, { type: "audio/webm" }));
    },
  };
}

/* ---------------- fixtures (mock mode) ---------------- */

const NOTICE =
  "Skipped and clearly different words are caught reliably. A word with one slightly wrong " +
  "sound is often written down as the correct word, so green does not prove a perfect reading.";

function word(
  op: WordOut["op"],
  w: string | null,
  said: string | null,
  index: number | null,
  check = false,
): WordOut {
  return { op, word: w, said, index, check };
}

/** The design's demo attempt: 20 reference words, 18 correct, 1 swap, 1 skip. */
const KN_PARTS: { text: string; words: WordOut[]; seconds: number }[] = [
  {
    text: "ಒಂದು ಪುಟ್ಟ ಚಿಟ್ಟೆ ತೋಟದಲ್ಲಿ ಹಾರುತ್ತಿತ್ತು ಅದು ಹೂವಿನ ಮೇಲೆ ಕುಳಿತುತ್ತಿತ್ತು",
    seconds: 14.3,
    words: [
      word("correct", "ಒಂದು", "ಒಂದು", 0),
      word("correct", "ಪುಟ್ಟ", "ಪುಟ್ಟ", 1),
      word("correct", "ಚಿಟ್ಟೆ", "ಚಿಟ್ಟೆ", 2),
      word("correct", "ತೋಟದಲ್ಲಿ", "ತೋಟದಲ್ಲಿ", 3),
      word("substituted", "ಹಾರುತ್ತಿತ್ತು", "ಓಡುತ್ತಿತ್ತು", 4),
      word("correct", "ಅದು", "ಅದು", 5),
      word("correct", "ಹೂವಿನ", "ಹೂವಿನ", 6),
      word("correct", "ಮೇಲೆ", "ಮೇಲೆ", 7),
      word("correct", "ಕುಳಿತುತ್ತಿತ್ತು", "ಕುಳಿತುತ್ತಿತ್ತು", 8),
    ],
  },
  {
    text: "ಕೆಂಪು ಹೂವು ಬಹಳ ಸುಂದರವಾಗಿತ್ತು ಚಿಟ್ಟೆ ಅದರ ಬಳಿ ಬಂದಿತು ಅದು ಮತ್ತೆ ಹಾರಿತು",
    seconds: 11.4,
    words: [
      word("skipped", "ಕೆಂಪು", null, 0),
      word("correct", "ಹೂವು", "ಹೂವು", 1),
      word("correct", "ಬಹಳ", "ಬಹಳ", 2),
      // Spelling-variant match: our scorer's "check this word" state.
      word("correct", "ಸುಂದರವಾಗಿತ್ತು", "ಸುಂದರವಾಗಿತು", 3, true),
      word("correct", "ಚಿಟ್ಟೆ", "ಚಿಟ್ಟೆ", 4),
      word("correct", "ಅದರ", "ಅದರ", 5),
      word("correct", "ಬಳಿ", "ಬಳಿ", 6),
      word("correct", "ಬಂದಿತು", "ಬಂದಿತು", 7),
      word("correct", "ಅದು", "ಅದು", 8),
      word("correct", "ಮತ್ತೆ", "ಮತ್ತೆ", 9),
      word("correct", "ಹಾರಿತು", "ಹಾರಿತು", 10),
    ],
  },
];

export const MOCK_PASSAGE: Passage = {
  id: "kn-101",
  language: "kn-IN",
  text: KN_PARTS.map((p) => p.text).join(". ") + ".",
};

export const MOCK_PARTS: { text: string }[] = KN_PARTS.map((p) => ({ text: p.text }));

export function mockAttempt(passageId: string, language: string, partIndex: number): Attempt {
  const part = KN_PARTS[Math.min(partIndex, KN_PARTS.length - 1)];
  const correct = part.words.filter((w) => w.op === "correct").length;
  return {
    notice: NOTICE,
    request_id: `mock-${passageId}-${partIndex}`,
    learner: "learner-1",
    passage_id: passageId,
    language,
    provider: "fixture",
    transcript: part.words.map((w) => w.said ?? "").join(" ").trim(),
    accuracy: correct / part.words.length,
    wcpm: Math.round((correct / part.seconds) * 60),
    words: part.words,
  };
}

export const MOCK_DURATIONS = KN_PARTS.map((p) => p.seconds);

export function mockPassages(lang: Lang): Passage[] {
  return [{ ...MOCK_PASSAGE, language: lang, id: `${lang.slice(0, 2)}-101` }];
}

export function mockNoticeLines(): string[] {
  return [NOTICE];
}

export function mockLanguageOf(id: string): Lang {
  const prefix = id.split("-")[0];
  return isLang(`${prefix}-IN`) ? (`${prefix}-IN` as Lang) : "kn-IN";
}
