import { useNavigate, useParams } from "react-router-dom";
import { ATTEMPT, childById } from "../../api/teacherData";
import { mockAttempt } from "../../api/mock";
import {
  Button,
  Card,
  LanguageBadge,
  ListenButton,
  StatCard,
  PageHeader,
  WordChip,
  wordStatus,
} from "../../components";
import { scriptClass } from "../../theme/script";

export function AttemptDetails() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const child = childById(childId);
  const words = mockAttempt(ATTEMPT.childId, child.lang, 0).words;

  return (
    <>
      <PageHeader
        back
        backTo={`/teacher/child/${child.id}`}
        badge={child.level}
        nav={[
          { label: "Class", to: "/teacher" },
          { label: "Story", to: "/teacher/story" },
          { label: "Add child", to: "/teacher/add" },
        ]}
      />
      <div className="screen-body">
        <p className="eyebrow">{ATTEMPT.eyebrow}</p>
        <h1 className="card__title">{ATTEMPT.title}</h1>
        <p className="reader-meta">{ATTEMPT.story}</p>

        <div className="workspace workspace--w320">
          {/* Left: attempt summary (320 wide in the frame). */}
          <div className="stack">
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
                {ATTEMPT.substituted} substituted · {ATTEMPT.skipped} skipped ·{" "}
                {ATTEMPT.insertions} insertions
              </p>
            </Card>

            <Button variant="outline" block onClick={() => navigate(`/teacher/child/${child.id}`)}>
              Back to {child.name.split(" ")[0]}
            </Button>
          </div>

          {/* Right: alignment and practice (848 wide in the frame). */}
          <div className="stack">
            <div className="metarow">
              <LanguageBadge lang={child.lang} />
              <span className="reader-meta">Aligned reference · Part 1 of 2</span>
            </div>

            <div className="chips">
              {words.map((w, i) => (
                <WordChip
                  key={`${w.index ?? i}-${w.word ?? ""}`}
                  status={wordStatus(w)}
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
          </div>
        </div>
      </div>
    </>
  );
}
