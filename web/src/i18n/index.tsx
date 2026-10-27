import { useCallback } from "react";
import { scriptClass, type Lang } from "../theme/script";
import en from "./en.json";
import hi from "./hi.json";
import kn from "./kn.json";
import ta from "./ta.json";

/**
 * Child-facing text in the child's language. `en.json` holds every key; a key missing from a
 * language file falls back to English, and the text then carries `lang="en"`, so a screen
 * reader never reads English with a Kannada voice. Review state is in `REVIEW.md`.
 */
export type CopyKey = keyof typeof en;
export type Vars = Record<string, string | number>;

const TABLES: Record<Lang, Partial<Record<CopyKey, string>>> = {
  "kn-IN": kn,
  "ta-IN": ta,
  "hi-IN": hi,
};

export const LANGUAGE_FILES = { en, kn, ta, hi } as const;

/** `{name}` placeholders in a string, sorted, for the parity check. */
export function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

export function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (all, k: string) => (k in vars ? String(vars[k]) : all));
}

/** The text for `key` and the language it is actually in. */
export function lookup(lang: Lang, key: CopyKey, vars?: Vars): { text: string; lang: Lang | "en" } {
  const native = TABLES[lang]?.[key];
  return native
    ? { text: fill(native, vars), lang }
    : { text: fill(en[key], vars), lang: "en" };
}

export function t(lang: Lang, key: CopyKey, vars?: Vars): string {
  return lookup(lang, key, vars).text;
}

/**
 * For a screen in `lang`: `t` for attributes (aria-label, alt), `Tx` for visible text, which
 * renders a span with the right `lang` and script class.
 */
export function useCopy(lang: Lang) {
  const tt = useCallback((key: CopyKey, vars?: Vars) => t(lang, key, vars), [lang]);
  const Tx = useCallback(
    function Tx({ k, vars }: { k: CopyKey; vars?: Vars }) {
      const r = lookup(lang, k, vars);
      return r.lang === "en" ? (
        <span lang="en">{r.text}</span>
      ) : (
        <span lang={r.lang} className={scriptClass(r.lang)}>
          {r.text}
        </span>
      );
    },
    [lang],
  );
  return { t: tt, Tx };
}
