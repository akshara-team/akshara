import type { Lang } from "../theme/script";

/**
 * Teacher-side demo data. The API has no children, roster or history
 * endpoints, so the teacher screens run on invented data — which is also what
 * the Figma handoff specifies ("All children, attempts and comparisons are
 * invented demo data, not observed facts").
 */
export type Child = {
  id: string;
  name: string;
  initials: string;
  level: string;
  lang: Lang;
  status: "in-target" | "practise";
  wcpm: number;
  accuracy: number;
};

export const CLASSROOM = {
  className: "Class 3",
  language: "ಕನ್ನಡ",
  children: 3,
  eyebrow: "Teacher · Demo data · 3 children",
};

export const CLASS_METRICS = [
  { value: "42", label: "Avg WCPM", delta: "↑ 4" },
  { value: "91%", label: "Accuracy", delta: "↑ 3 pp" },
  { value: "1 / 3", label: "Need help", delta: "→ 1 last week" },
];

export const CHILDREN: Child[] = [
  {
    id: "aarav",
    name: "Aarav Gowda",
    initials: "AG",
    level: "Class 3",
    lang: "kn-IN",
    status: "in-target",
    wcpm: 42,
    accuracy: 0.9,
  },
  {
    id: "diya",
    name: "Diya K.",
    initials: "DK",
    level: "Class 2",
    lang: "kn-IN",
    status: "in-target",
    wcpm: 50,
    accuracy: 0.95,
  },
  {
    id: "rohan",
    name: "Rohan M.",
    initials: "RM",
    level: "Class 3",
    lang: "kn-IN",
    status: "practise",
    wcpm: 28,
    accuracy: 0.72,
  },
];

export function childById(id: string | undefined): Child {
  return CHILDREN.find((c) => c.id === id) ?? CHILDREN[0];
}

export const HISTORY = [
  { date: "5 Oct", wcpm: 30, accuracy: 0.8 },
  { date: "12 Oct", wcpm: 36, accuracy: 0.85 },
  { date: "19 Oct", wcpm: 42, accuracy: 0.9 },
];

export const NIPUN_BAND = { min: 35, max: 54 };

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

export const ATTEMPT = {
  childId: "aarav",
  eyebrow: "Teacher · Demo attempt · 19 Oct 2026",
  title: "Aarav's reading",
  story: "The colourful butterfly · ಕನ್ನಡ · Level 2",
  wcpm: 42,
  accuracy: 0.9,
  correct: 18,
  reference: 20,
  seconds: 25.7,
  substituted: 1,
  skipped: 1,
  insertions: 0,
  transcript: "ಒಂದು ಪುಟ್ಟ ಚಿಟ್ಟೆ ತೋಟದಲ್ಲಿ ಓಡುತ್ತಿತ್ತು ಅದು ಹೂವಿನ ಮೇಲೆ ಕುಳಿತುತ್ತಿತ್ತು",
  practice: ["ಹಾರುತ್ತಿತ್ತು", "ಕೆಂಪು"],
};
