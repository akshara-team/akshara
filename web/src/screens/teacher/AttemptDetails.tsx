import { useNavigate, useParams } from "react-router-dom";
import { ATTEMPT, childById } from "../../api/teacherData";
import { mockAttempt } from "../../api/mock";
import type { WordOut } from "../../api/types";
import { Button, Card, LanguageBadge, ListenButton, StatCard, TopBar, WordChip, type WordStatus } from "../../components";
import { scriptClass } from "../../theme/script";

function statusOf(w: WordOut): WordStatus {
  if (w.check) return "uncertain";
  if (w.op === "substituted") return "substituted";
  if (w.op === "skipped") return "skipped";
  return "correct";
}

export function AttemptDetails() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const child = childById(childId);
  const words = mockAttempt(ATTEMPT.childId, child.lang, 0).words;

  return (
    <>
      <TopBar back backTo={`/teacher/child/${child.id}`} />
      <div className="screen-body">
        <p className="eyebrow">{ATTEMPT.eyebrow}</p>
        <h1 className="card__title">{ATTEMPT.title}</h1>
        <p className="reader-meta">{ATTEMPT.story}</p>

        <div className="stats-grid">
          <StatCard label="WCPM" value={String(ATTEMPT.wcpm)} />
          <StatCard label="Accuracy" value={`${Math.round(ATTEMPT.accuracy * 100)}%`} />
        </div>

        <Card>
          <p className="reader-name">
            {ATTEMPT.correct} correct / {ATTEMPT.reference} reference words
          </p>
          <p className="note">
            WCPM = {ATTEMPT.correct} ÷ {ATTEMPT.seconds} s × 60 ≈ {ATTEMPT.wcpm}
          </p>
          <p className="note">
            Accuracy = {ATTEMPT.correct} ÷ {ATTEMPT.reference} × 100 ={" "}
            {Math.round(ATTEMPT.accuracy * 100)}%
          </p>
          <p className="note">
            {ATTEMPT.substituted} substituted · {ATTEMPT.skipped} skipped · {ATTEMPT.insertions}{" "}
            insertions
          </p>
        </Card>

        <div className="metarow">
          <LanguageBadge lang={child.lang} />
          <span className="reader-meta">Aligned reference · Part 1 of 2</span>
        </div>

        <div className="chips">
          {words.map((w, i) => (
            <WordChip
              key={`${w.index ?? i}-${w.word ?? ""}`}
              status={statusOf(w)}
              word={w.word ?? ""}
              lang={child.lang}
            />
          ))}
        </div>

        <Card>
          <p className="eyebrow">Heard, not the reference</p>
          <p className={`reading-text ${scriptClass(child.lang)}`}>{ATTEMPT.transcript}</p>
        </Card>

        <div className="practice">
          <p className="eyebrow">Recommended practice</p>
          {ATTEMPT.practice.map((word) => (
            <div className="practice__row" key={word}>
              <span className={`reading-text ${scriptClass(child.lang)}`}>{word}</span>
              <ListenButton text={word} lang={child.lang} />
            </div>
          ))}
        </div>

        <div className="actions">
          <Button block onClick={() => navigate("/teacher")}>
            Back to class
          </Button>
        </div>
      </div>
    </>
  );
}
