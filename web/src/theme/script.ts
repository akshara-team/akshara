export type Lang = "kn-IN" | "ta-IN" | "hi-IN";

export const LANGS: Lang[] = ["kn-IN", "ta-IN", "hi-IN"];

const SCRIPT: Record<Lang, { cls: string; name: string; english: string }> = {
  "kn-IN": { cls: "script-kn", name: "ಕನ್ನಡ", english: "Kannada" },
  "ta-IN": { cls: "script-ta", name: "தமிழ்", english: "Tamil" },
  "hi-IN": { cls: "script-hi", name: "हिंदी", english: "Hindi" },
};

export const scriptClass = (lang: Lang) => SCRIPT[lang].cls;
export const scriptName = (lang: Lang) => SCRIPT[lang].name;
export const scriptEnglish = (lang: Lang) => SCRIPT[lang].english;

export function isLang(value: string): value is Lang {
  return value in SCRIPT;
}
