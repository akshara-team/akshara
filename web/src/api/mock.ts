import { isLang, type Lang } from "../theme/script";
import type { Attempt, Passage, WordOut } from "./types";
import { MIC_CONSTRAINTS, openMeter, type Meter } from "../audio/meter";
import { clipNoise, type Verdict } from "../audio/noise";
import demoData from "../data/demo.json";

/** Decodes a recorded clip (any format the browser recorded) to mono 16 kHz samples. */
export async function decode16k(blob: Blob): Promise<Float32Array> {
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const frames = Math.ceil(decoded.duration * 16000);
    if (frames === 0) return new Float32Array(0);
    const off = new OfflineAudioContext(1, frames, 16000);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    return (await off.startRendering()).getChannelData(0);
  } finally {
    await ctx.close();
  }
}

/** 16 kHz mono samples as a 16-bit PCM WAV, the format the backend accepts. */
export function encodeWav(pcm: Float32Array): Blob {
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

/** Length of a WAV from `encodeWav`: 16 kHz, 16-bit mono after a 44-byte header. */
export function wavSeconds(wav: Blob): number {
  return Math.max(0, wav.size - 44) / 32000;
}

/** Same approach as the original screen in `src/akshara/api/static/index.html`. */
export async function toWav16k(blob: Blob): Promise<Blob> {
  return encodeWav(await decode16k(blob));
}

/** Longest reading the backend takes (settings.max_audio_seconds). */
export const MAX_RECORDING_S = 90;
/** Shorter than this is a slip of the finger, not a reading. */
export const MIN_RECORDING_S = 0.7;
/** Peak level below which nothing was heard (muted mic, wrong input device). */
export const SILENCE_PEAK = 0.02;

export type RecordingProblem = "silent" | "short";

export class RecordingError extends Error {
  constructor(public problem: RecordingProblem) {
    super(problem);
    this.name = "RecordingError";
  }
}

/** Why a clip should not be sent, or null when it is fine. Pure, so it is tested directly. */
export function checkClip(pcm: Float32Array, rate = 16000): RecordingProblem | null {
  if (pcm.length < rate * MIN_RECORDING_S) return "short";
  let peak = 0;
  for (let i = 0; i < pcm.length; i++) peak = Math.max(peak, Math.abs(pcm[i]));
  return peak < SILENCE_PEAK ? "silent" : null;
}

export type RecorderState = "idle" | "requesting" | "recording" | "error";

export type Recorder = {
  state: RecorderState;
  error: string | null;
  /** The microphone level now, in dB below full scale; null before start or without Web Audio. */
  level: () => number | null;
  /** Whether the last clip stop() returned sounded noisy; null before then. */
  noise: Verdict | null;
  start: () => Promise<void>;
  /** Stops and resolves the recorded clip as 16 kHz WAV; throws RecordingError if unusable. */
  stop: () => Promise<Blob>;
  /** Stops and throws the clip away. */
  cancel: () => void;
};

/** Thin wrapper over MediaRecorder that hands back a backend-ready WAV. */
export function createRecorder(): Recorder {
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: BlobPart[] = [];
  let stopped: Promise<void> = Promise.resolve();
  let meter: Meter | null = null;

  function release() {
    meter?.close();
    meter = null;
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    recorder = null;
  }

  const rec: Recorder = {
    state: "idle",
    error: null,
    noise: null,
    level: () => meter?.level() ?? null,

    async start() {
      const media = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
      stream = media;
      meter = openMeter(media);
      chunks = [];
      // A high bitrate: compression at the default rate is enough to turn one sound into
      // another on a single word (heard live: நாளை as நாலு), and a re-read is one word.
      recorder = new MediaRecorder(media, { audioBitsPerSecond: 128_000 });
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
      // Safari records audio/mp4, Chrome and Firefox audio/webm: keep what was recorded.
      const type = recorder.mimeType || "audio/webm";
      recorder.stop();
      await stopped;
      release();
      const pcm = await decode16k(new Blob(chunks, { type }));
      const problem = checkClip(pcm);
      if (problem) throw new RecordingError(problem);
      rec.noise = clipNoise(pcm).verdict;
      return encodeWav(pcm);
    },

    cancel() {
      if (recorder && recorder.state !== "inactive") recorder.stop();
      release();
    },
  };
  return rec;
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

export type DemoPart = { text: string; words: WordOut[] };
type DemoStory = { id: string; title?: string; source?: string; parts: DemoPart[] };

/** The design's demo story (Figma measurement example), kept word for word. */
const KN_STORY: DemoStory = {
  id: "kn-101",
  title: "ಬಣ್ಣದ ಚಿಟ್ಟೆ",
  parts: KN_PARTS.map((p) => ({ text: p.text, words: p.words })),
};

/**
 * One demo story per language: Kannada is the design's; Tamil and Hindi are real open
 * passages, generated into `data/demo.json` by `scripts/build_demo_stories.py`. A child in
 * Tamil is given Tamil, never the Kannada story.
 */
const STORIES: Record<Lang, DemoStory> = {
  "kn-IN": KN_STORY,
  "ta-IN": demoData.languages["ta-IN"] as unknown as DemoStory,
  "hi-IN": demoData.languages["hi-IN"] as unknown as DemoStory,
};

/** The demo story for a language; Kannada when an unknown code slips through. */
export function demoStory(lang: Lang): DemoStory {
  return STORIES[lang] ?? KN_STORY;
}

export function mockPassage(lang: Lang): Passage {
  const story = demoStory(lang);
  const parts = story.parts.map((p) => p.text);
  return {
    id: story.id,
    language: lang,
    title: story.title ?? null,
    level: "2",
    text: parts.join(" "),
    parts,
    // Tamil and Hindi are real StoryWeaver books: carry the credit so the cover and its
    // licence line can be shown. Kannada is the design's own story and has none.
    credit: story.source
      ? {
          url: `https://storyweaver.org.in/en/stories/${story.source.replace(/^sw-/, "")}`,
          licence: "CC BY 4.0",
        }
      : null,
  };
}

export function mockPassages(lang: Lang): Passage[] {
  return [mockPassage(lang)];
}

/** A passage by id: the id's language prefix picks the story. */
export function mockGetPassage(id: string): Passage {
  return { ...mockPassage(mockLanguageOf(id)), id };
}

/** The demo story's reference words, in reading order. */
export function mockReferenceWords(lang: Lang = "kn-IN"): string[] {
  return demoStory(lang).parts.flatMap((p) =>
    p.words.map((w) => w.word).filter((w): w is string => !!w),
  );
}

export const MOCK_DURATIONS = KN_PARTS.map((p) => p.seconds);

/** How long a demo part takes: the design's times for Kannada, else by length. */
function demoSeconds(lang: Lang, index: number, words: number): number {
  if (lang === "kn-IN") return MOCK_DURATIONS[Math.min(index, MOCK_DURATIONS.length - 1)] ?? 12;
  return Math.max(3, Math.round(words * 0.8));
}

export function mockAttempt(passageId: string, language: string, partIndex: number): Attempt {
  const lang: Lang = isLang(language) ? language : "kn-IN";
  const parts = demoStory(lang).parts;
  const index = Math.min(Math.max(partIndex, 0), parts.length - 1);
  const part = parts[index];
  const correct = part.words.filter((w) => w.op === "correct").length;
  const seconds = demoSeconds(lang, index, part.words.length);
  return {
    notice: NOTICE,
    request_id: `mock-${passageId}-${index}`,
    learner: "learner-1",
    passage_id: passageId,
    language: lang,
    provider: "fixture",
    transcript: part.words.map((w) => w.said ?? "").join(" ").trim(),
    accuracy: correct / part.words.length,
    wcpm: Math.round((correct / seconds) * 60),
    words: part.words,
    part_index: index,
  };
}

export function mockNoticeLines(): string[] {
  return [NOTICE];
}


export function mockLanguageOf(id: string): Lang {
  const prefix = id.split("-")[0];
  return isLang(`${prefix}-IN`) ? (`${prefix}-IN` as Lang) : "kn-IN";
}
