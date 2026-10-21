import { isMock } from "../api";

const BASE = import.meta.env.VITE_API_BASE ?? "";

export type PlaySource = "model" | "device" | "none";

/** Device voice, used when the model audio isn't available. */
function speak(text: string, lang: string): boolean {
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
 * Live mode asks the backend for Timbre audio (`/v1/feedback/audio`); that
 * endpoint does not exist yet, so a miss falls back to the device voice rather
 * than failing silently. Mock mode uses the device voice so the demo speaks.
 */
export async function play(text: string, lang: string): Promise<PlaySource> {
  if (!isMock) {
    try {
      const url = `${BASE}/v1/feedback/audio?lang=${encodeURIComponent(lang)}&word=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (res.ok) {
        const objectUrl = URL.createObjectURL(await res.blob());
        await new Audio(objectUrl).play();
        URL.revokeObjectURL(objectUrl);
        return "model";
      }
    } catch {
      // fall through to the device voice
    }
  }
  return speak(text, lang) ? "device" : "none";
}
