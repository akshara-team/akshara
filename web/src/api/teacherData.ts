import type { Lang } from "../theme/script";

/**
 * Fixed figures the teacher screens still use. Children and readings come from the API
 * (`/v1/children`), or from `mockClass.ts` in mock mode.
 */

/** Placeholder target band in words correct per minute; WP8 replaces it with NIPUN bands
 * per grade and language. */
export const NIPUN_BAND = { min: 35, max: 54 };

/** The story picker's demo story (mock mode). */
export const STORY = {
  id: "kn-101",
  language: "kn-IN" as Lang,
  title: "ಬಣ್ಣದ ಚಿಟ್ಟೆ",
  english: "The colourful butterfly",
  words: 20,
  preview: "ಒಂದು ಪುಟ್ಟ ಚಿಟ್ಟೆ ತೋಟದಲ್ಲಿ ಹಾರುತ್ತಿತ್ತು.",
  parts: 2,
  seconds: 30,
};
