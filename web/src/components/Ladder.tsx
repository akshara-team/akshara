import { BookIcon, CheckIcon } from "./icons";

export type Rung = { key: string; label: string };

type Props = {
  title: string;
  rungs: Rung[];
  /** Index of the child's rung (0 = the bottom one). */
  current: number;
  hereLabel: string;
  lang: string;
  scriptClassName: string;
};

/**
 * The child's reading ladder, as painted on an Activity-Based Learning classroom wall:
 * ASER's steps from letters to a whole story, read bottom to top. Climbed rungs carry a
 * tick, the child's rung is lit, the ones above wait.
 */
export function Ladder({ title, rungs, current, hereLabel, lang, scriptClassName }: Props) {
  return (
    <section className="ladder" aria-label={title}>
      <h2 className={`ladder__title ${scriptClassName}`} lang={lang}>
        {title}
      </h2>
      <ol className="ladder__rungs" reversed>
        {[...rungs].reverse().map((r, i) => {
          const index = rungs.length - 1 - i;
          const state = index < current ? "done" : index === current ? "here" : "next";
          return (
            <li key={r.key} className="ladder__rung" data-state={state}>
              <span className="ladder__badge" aria-hidden="true">
                {state === "done" ? (
                  <CheckIcon width={22} height={22} />
                ) : state === "here" ? (
                  <BookIcon width={22} height={22} />
                ) : (
                  index + 1
                )}
              </span>
              <span className={`ladder__label ${scriptClassName}`} lang={lang}>
                {r.label}
              </span>
              {state === "here" && (
                <span className={`ladder__here ${scriptClassName}`} lang={lang}>
                  {hereLabel}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
