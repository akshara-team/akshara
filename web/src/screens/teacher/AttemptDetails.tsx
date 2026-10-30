import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import { levelOf } from "../../api/classSummary";
import {
  Button,
  Card,
  EmptyState,
  LanguageBadge,
  ListenButton,
  StatCard,
  PageHeader,
  WordChip,
  wordStatus,
} from "../../components";
import { useLoad } from "../../state/useLoad";
import { scriptClass, type Lang } from "../../theme/script";
import { shortDate } from "./ChildProfile";
import { TEACHER_NAV } from "./nav";

const NAV = TEACHER_NAV;

/** One reading of a story by one child: what was heard, word by word, and what to practise. */
export function AttemptDetails() {
  const { childId, session } = useParams<{ childId: string; session: string }>();
  const navigate = useNavigate();
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
        <div className="screen-body">
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
        <div className="screen-body">
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
      <div className="screen-body">
        <h1 className="card__title">{first}’s reading</h1>
        <p className="reader-meta">
          <span className={scriptClass(lang)} lang={lang}>
            {reading.title ?? reading.passage_id}
          </span>
          , {partsText}, {shortDate(reading.at)}
        </p>

        <div className="workspace workspace--w320">
          <div className="stack">
            <div className="stats-grid">
              <StatCard label="WCPM" value={wcpm == null ? "—" : String(wcpm)} />
              <StatCard label="Accuracy" value={`${Math.round(reading.accuracy * 100)}%`} />
            </div>

            <Card>
              <p className="reader-name">
                {reading.correct} correct / {reading.total} words in the story
              </p>
              {reading.seconds != null && wcpm != null && (
                <p className="note">
                  WCPM = {reading.correct} ÷ {reading.seconds.toFixed(1)} s × 60 ≈ {wcpm}
                </p>
              )}
              <p className="note">
                Accuracy = {reading.correct} ÷ {reading.total} × 100 ={" "}
                {Math.round(reading.accuracy * 100)}%
              </p>
              <p className="note">
                {count("substituted")} read differently, {count("skipped")} skipped,{" "}
                {count("inserted")} extra
              </p>
            </Card>

            <Button variant="outline" block onClick={() => navigate(`/teacher/child/${child.id}`)}>
              Back to {first}
            </Button>
          </div>

          <div className="stack">
            <div className="metarow">
              <LanguageBadge lang={lang} />
              <span className="reader-meta">The story, word by word</span>
            </div>

            <div className="chips">
              {reading.words
                .filter((w) => w.op !== "inserted")
                .map((w, i) => (
                  <WordChip
                    key={`${i}-${w.word ?? ""}`}
                    status={wordStatus(w)}
                    word={w.word ?? ""}
                    lang={lang}
                  />
                ))}
            </div>

            <Card>
              <p className="eyebrow">What the speech service heard</p>
              <p className={`reading-text ${scriptClass(lang)}`} lang={lang}>
                {reading.transcript || "—"}
              </p>
            </Card>

            {practice.length > 0 && (
              <div className="practice">
                <p className="eyebrow">Practise next</p>
                {practice.map((word) => (
                  <div className="practice__row" key={word}>
                    <span className={`reading-text ${scriptClass(lang)}`} lang={lang}>
                      {word}
                    </span>
                    <ListenButton text={word} lang={lang} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
