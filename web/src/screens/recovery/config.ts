/**
 * Recovery screens (Figma section 04). Copy is taken from the design frames;
 * steps are the design's "3 easy steps" lists.
 */
export type RecoveryVariant = {
  key: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  steps?: string[];
  primary: { label: string; to: string };
  secondary?: { label: string; to: string };
  /** Shown in place of steps when the screen is just a waiting state. */
  note?: string;
};

export const RECOVERY: Record<string, RecoveryVariant> = {
  microphone: {
    key: "microphone",
    title: "We need the microphone",
    subtitle: "No recording started yet.",
    steps: [
      "Open the site controls next to the browser address.",
      "Choose Permissions → Microphone → Allow.",
      "Come back here and tap the microphone to try again.",
    ],
    primary: { label: "Try microphone again", to: "/read" },
    secondary: { label: "Back to story", to: "/reader" },
  },
  loading: {
    key: "loading",
    title: "Getting your story ready",
    subtitle: "Your story is coming!",
    note: "The story and its audio open together.",
    primary: { label: "Wait a moment", to: "/reader" },
  },
  connection: {
    key: "connection",
    title: "Almost there…",
    subtitle: "Still checking your reading…",
    note: "A little longer. Your story is still here.",
    primary: { label: "Ask a teacher for help", to: "/" },
  },
  offline: {
    key: "offline",
    title: "You look offline",
    subtitle: "Part 1 of 2 — your reading is safe on this page.",
    steps: [
      "Keep this page open.",
      "Retry with this recording, if it is still available.",
      "If it is no longer available, read this part again.",
    ],
    primary: { label: "Retry sending reading", to: "/checking" },
    secondary: { label: "Read this part again", to: "/read" },
  },
  speech: {
    key: "speech",
    title: "We could not hear that clearly",
    subtitle: "No score was calculated.",
    steps: [
      "Listen to the model reading once more.",
      "Retry recognition if the recording is available.",
      "Ask your teacher if you need help setting up.",
    ],
    primary: { label: "Retry recognition", to: "/checking" },
    secondary: { label: "Back to story", to: "/reader" },
  },
  service: {
    key: "service",
    title: "Oops! Something got mixed up",
    subtitle: "Reading not evaluated.",
    steps: [
      "This is on our side, not yours.",
      "Try again if the audio is still available.",
      "If it keeps happening, ask your teacher.",
    ],
    primary: { label: "Try again", to: "/checking" },
    secondary: { label: "Return to story", to: "/reader" },
  },
};

export function recoveryVariant(kind: string | undefined): RecoveryVariant {
  return (kind && RECOVERY[kind]) || RECOVERY.service;
}
