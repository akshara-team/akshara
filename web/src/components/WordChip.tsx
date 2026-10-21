import type { ReactNode } from "react";
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
}: {
  status: WordStatus;
  word: string;
  lang: Lang;
}) {
  return (
    <span className={`wordchip wordchip--${status}`} title={TITLE[status]}>
      <span className="wordchip__icon" aria-hidden="true">
        {ICON[status]}
      </span>
      <span className={`wordchip__word ${scriptClass(lang)}`}>{word}</span>
    </span>
  );
}
