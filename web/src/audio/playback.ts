import { api } from "../api";
import type { Lang } from "../theme/script";

export type PlaySource = "model" | "device" | "none";

/** Device voice, used when the model audio isn't available. */
function speak(text: string, lang: Lang): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

/**
 * Play a word or passage aloud.
 *
 * Asks the API for Timbre audio first (`/v1/feedback/audio`, served from a
 * content cache on the server). If the endpoint is unavailable, in mock mode,
 * or the browser blocks playback, it falls back to the device voice. Reports
 * "none" when neither is possible.
 */
export async function play(text: string, lang: Lang): Promise<PlaySource> {
  const blob = await api.feedbackAudio(text, lang).catch(() => null);

  if (blob) {
    const objectUrl = URL.createObjectURL(blob);
    try {
      await new Audio(objectUrl).play();
      URL.revokeObjectURL(objectUrl);
      return "model";
    } catch {
      URL.revokeObjectURL(objectUrl);
      // fall through: autoplay blocked, or the clip could not be decoded
    }
  }

  return speak(text, lang) ? "device" : "none";
}
