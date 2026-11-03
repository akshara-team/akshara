import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import { levelOf } from "../../api/classSummary";
import {
  CheckIcon,
  EmptyState,
  ListenButton,
  MarkedText,
  PageHeader,
  QuestionIcon,
  SwapIcon,
} from "../../components";
import { useLoad } from "../../state/useLoad";
import { scriptClass, type Lang } from "../../theme/script";
import { shortDate } from "./ChildProfile";
import { TEACHER_NAV } from "./nav";

const NAV = TEACHER_NAV;

/**
 * One reading by one child, for the teacher: the figures and how they were worked out in one
 * place, the story marked word by word exactly as the child saw it, what the speech service
 * heard, and the words to practise next.
 */
export function AttemptDetails() {
  const { childId, session } = useParams<{ childId: string; session: string }>();
  const id = Number(childId);
  const { data, error } = useLoad(
    async () => Promise.all([api.getChild(id), api.childReadings(id)]),
    [id],
  );

  const reading = data?.[1].find((r) => r.session === session);
  if (error || (data && !reading)) {
    return (
      <>
        <PageHeader back backTo={`/teacher/child/${id}`} nav={NAV} />
        <div className="register-page">
          <EmptyState title="Reading not found">
            <Link className="screen__link" to={`/teacher/child/${id}`}>
              Back to the child
            </Link>
          </EmptyState>
        </div>
      </>
    );
  }
  if (!data || !reading) {
    return (
      <>
        <PageHeader back backTo={`/teacher/child/${id}`} nav={NAV} />
        <div className="register-page">
          <p className="note" role="status">
            Loading…
          </p>
        </div>
      </>
    );
  }

  const child = data[0];
  const lang = reading.language as Lang;
  const first = child.alias.split(" ")[0];
  const count = (op: string) => reading.words.filter((w) => w.op === op).length;
  const wcpm = reading.wcpm == null ? null : Math.round(reading.wcpm);
  const accuracy = Math.round(reading.accuracy * 100);
  // Up to three words the child missed, in reading order: what to practise next.
  const practice = [
    ...new Set(
      reading.words
        .filter((w) => (w.op === "substituted" || w.op === "skipped") && w.word)
        .map((w) => w.word as string),
    ),
  ].slice(0, 3);
  const partsText = reading.parts.length
    ? `${reading.parts.length} ${reading.parts.length === 1 ? "part" : "parts"}`
    : "whole story";

  return (
    <>
      <PageHeader back backTo={`/teacher/child/${child.id}`} badge={levelOf(child.grade)} nav={NAV} />
      <div className="register-page">
        <div className="register-head">
          <h1 className="register-head__title">{first}’s reading</h1>
        </div>

        {/* The figures, and how each was worked out, so the teacher can check them. */}
        <div className="register-status">
          <p>
            <span className={scriptClass(lang)} lang={lang}>
              {reading.title ?? reading.passage_id}
            </span>
            , {partsText}, {shortDate(reading.at)}.{" "}
            <strong>
              {reading.correct} correct / {reading.total} words in the story
            </strong>
            : <span className="num">{wcpm ?? "-"}</span> words a minute,{" "}
            <span className="num">{accuracy}%</span> right. {count("substituted")} read differently,{" "}
            {count("skipped")} skipped, {count("inserted")} extra.
          </p>
          <p className="register-status__goal">
            {reading.seconds != null && wcpm != null && (
              <>
                WCPM = {reading.correct} ÷ {reading.seconds.toFixed(1)} s × 60 ≈ {wcpm}.{" "}
              </>
            )}
            Accuracy = {reading.correct} ÷ {reading.total} × 100 = {accuracy}%.
          </p>
        </div>

        <article className="book-page book-page--teacher">
          <p className="sounds__label">The story, word by word</p>
          <MarkedText words={reading.words.filter((w) => w.op !== "inserted")} lang={lang} forTeacher />
          <p className="mark-legend">
            <span>
              <CheckIcon width={16} height={16} aria-hidden="true" /> read right
            </span>
            <span>
              <SwapIcon width={16} height={16} aria-hidden="true" /> read as another word (hover to
              see it)
            </span>
            <span>
              <i className="mark-legend__dot" aria-hidden="true" /> skipped
            </span>
            <span>
              <QuestionIcon width={16} height={16} aria-hidden="true" /> check by ear
            </span>
          </p>
        </article>

        <section className="heard">
          <h2 className="sounds__label">What the speech service heard</h2>
          <p className={`heard__text ${scriptClass(lang)}`} lang={lang}>
            {reading.transcript || "-"}
          </p>
        </section>

        {practice.length > 0 && (
          <>
            <h2 className="register-section">Practise next</h2>
            <div className="register">
              <table className="register__table">
                <tbody>
                  {practice.map((word) => (
                    <tr key={word} className="register__row">
                      <td>
                        <span className={`practise-word ${scriptClass(lang)}`} lang={lang}>
                          {word}
                        </span>
                      </td>
                      <td className="num">
                        <ListenButton text={word} lang={lang} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <Link className="register__open" to={`/teacher/child/${child.id}`}>
          Back to {first}
        </Link>
      </div>
    </>
  );
}
