import type { ReactNode } from "react";
import { t, type CopyKey } from "../i18n";
import { scriptClass, type Lang } from "../theme/script";
import { CheckIcon, MinusIcon, QuestionIcon, SwapIcon } from "./icons";

export type WordStatus = "correct" | "substituted" | "skipped" | "uncertain";

/** Maps a scorer word (`op` + `check`) to the chip state used across screens. */
export function wordStatus(w: { op: string; check?: boolean }): WordStatus {
  if (w.check) return "uncertain";
  if (w.op === "substituted") return "substituted";
  if (w.op === "skipped") return "skipped";
  return "correct";
}

const ICON: Record<WordStatus, ReactNode> = {
  correct: <CheckIcon width={14} height={14} />,
  substituted: <SwapIcon width={14} height={14} />,
  skipped: <MinusIcon width={14} height={14} />,
  uncertain: <QuestionIcon width={14} height={14} />,
};

const TITLE: Record<WordStatus, string> = {
  correct: "read correctly",
  substituted: "read as a different word",
  skipped: "skipped",
  uncertain: "heard with a different spelling — check this word",
};

const KEY: Record<WordStatus, CopyKey> = {
  correct: "chip.correct",
  substituted: "chip.substituted",
  skipped: "chip.skipped",
  uncertain: "chip.check",
};

/**
 * One aligned word from an attempt.
 *
 * "uncertain" is our addition: the scorer marks a word `check` when it counted
 * it correct only through a spelling-variant rule. The Figma library has only
 * correct/substituted/skipped, so this fourth state is deliberately dashed.
 */
export function WordChip({
  status,
  word,
  lang,
  uiLang,
}: {
  status: WordStatus;
  word: string;
  lang: Lang;
  /** Language of the screen around the chip; teacher screens leave it out (English). */
  uiLang?: Lang;
}) {
  const said = uiLang ? t(uiLang, KEY[status]) : TITLE[status];
  return (
    <span className={`wordchip wordchip--${status}`} title={said}>
      <span className="wordchip__icon" aria-hidden="true">
        {ICON[status]}
      </span>
      <span className={`wordchip__word ${scriptClass(lang)}`} lang={lang}>
        {word}
      </span>
      {/* The icon and colour are visual only; this says the same thing aloud. */}
      <span className="sr-only" lang={uiLang && said !== TITLE[status] ? uiLang : "en"}>
        , {said}
      </span>
    </span>
  );
}
