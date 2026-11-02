import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Action, ChildFrame, FlagIcon, Kolam, SparklesIcon, StarIcon, pictureOf } from "../../components";
import { useSession } from "../../state/session";
import { addReading, buildReading, load as loadChild } from "../../state/storage";
import { scriptClass } from "../../theme/script";
import { useCopy } from "../../i18n";
import { PRACTICE_WORDS } from "./PracticeScreen";
import { storyTitle } from "./title";

const PUNCTUATION = /[.,!?;:"'“”‘’।॥()]/g;

/**
 * The end of a story: its kolam completes, line by line, and joins the child's row at home.
 * A count of words read right and a star; speeds and percentages are the teacher's.
 */
export function ResultsScreen() {
  const { lang, reader, passage, parts, sessionId, reset } = useSession();
  const navigate = useNavigate();
  const { Tx } = useCopy(lang);
  const saved = useRef(false);
  const me = reader ?? loadChild().reader;

  const words = parts.filter((p) => p.attempt).flatMap((p) => p.attempt?.words ?? []);
  const counted = words.filter((w) => w.op !== "inserted");
  const right = counted.filter((w) => w.op === "correct").length;
  const missed = counted.filter((w) => w.op === "substituted" || w.op === "skipped");
  // The first few different words the child missed, in reading order.
  // Punctuation is not an akshara: "பார்க்கலாம்." is practised as பார்க்கலாம்.
  const practise = [
    ...new Set(missed.map((w) => (w.word ?? "").replace(PUNCTUATION, "")).filter(Boolean)),
  ].slice(0, PRACTICE_WORDS);

  // Record the reading once, so the child's home can show its kolam.
  useEffect(() => {
    if (saved.current || !sessionId || !passage) return;
    const reading = buildReading({
      id: sessionId,
      passageId: passage.id,
      storyTitle: storyTitle(passage),
      language: lang,
      parts,
    });
    if (!reading) return;
    saved.current = true;
    addReading(reading);
  }, [sessionId, passage, parts, lang]);

  function finish() {
    reset();
    navigate("/home");
  }

  return (
    <ChildFrame
      lang={lang}
      lineKey="results.title"
      title="Results"
      mark={me ? pictureOf(me.id, me.picture) : null}
      action={
        practise.length > 0 ? (
          <>
            <Action
              icon={<SparklesIcon />}
              onClick={() => navigate("/practice", { state: { words: practise } })}
            >
              <Tx k="practice.start" />
            </Action>
            <button type="button" className="action-aside" onClick={finish}>
              <Tx k="results.finish" />
            </button>
          </>
        ) : (
          <Action icon={<FlagIcon />} onClick={finish}>
            <Tx k="results.finish" />
          </Action>
        )
      }
    >
      <div className="finish" role="status">
        <div className="finish__kolam">
          <Kolam seed={passage?.id ?? "akshara"} tone="leaf" mode="draw" />
          <span className="finish__star keep-motion" role="img" aria-label={`${storyTitle(passage)}: ★`}>
            <StarIcon width={56} height={56} aria-hidden="true" />
          </span>
        </div>
        <h1 className={`display ${scriptClass(lang)}`} lang={lang}>
          {counted.length > 0 ? (
            <Tx k="results.wordsRight" vars={{ right, total: counted.length }} />
          ) : (
            <Tx k="results.title" />
          )}
        </h1>
        <p className={`finish__story ${scriptClass(lang)}`} lang={lang}>
          {storyTitle(passage)}
        </p>
      </div>
    </ChildFrame>
  );
}
