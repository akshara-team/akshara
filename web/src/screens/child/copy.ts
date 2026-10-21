import type { Lang } from "../../theme/script";

/**
 * Reading-flow strings. The demo language is Kannada, so the design's Kannada
 * copy is used there and English is the fallback for the other two (the design
 * only expanded the Kannada reading screens).
 */
type FlowCopy = {
  storyTitle: string;
  tapToStart: string;
  recording: string;
  listening: string;
  readAloud: string;
  readPace: string;
  restVoice: string;
  listen: string;
  wellRead: string;
  partOf: (n: number, total: number) => string;
  continueToPart: (n: number) => string;
};

const KN: FlowCopy = {
  storyTitle: "ಬಣ್ಣದ ಚಿಟ್ಟೆ",
  tapToStart: "ಓದಲು ಪ್ರಾರಂಭಿಸಿ · Tap to start",
  recording: "Recording · Tap to stop",
  listening: "Listening to your reading…",
  readAloud: "Read these sentences aloud.",
  readPace: "Read at your own pace.",
  restVoice: "You can rest your voice now.",
  listen: "Listen",
  wellRead: "ಚೆನ್ನಾಗಿ ಓದಿದೆ!",
  partOf: (n, total) => `Part ${n} of ${total} · Chunk ${n} of ${total}`,
  continueToPart: (n) => `Continue to part ${n}`,
};

const EN: FlowCopy = {
  ...KN,
  storyTitle: "The Colourful Butterfly",
  tapToStart: "Tap to start",
  wellRead: "Well read!",
};

export function flowCopy(lang: Lang): FlowCopy {
  return lang === "kn-IN" ? KN : EN;
}
