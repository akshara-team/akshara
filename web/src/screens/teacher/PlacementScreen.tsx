import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, statusOf } from "../../api";
import { RecordingError, createRecorder, type Recorder } from "../../api/mock";
import type { Level, MarkState, Placement } from "../../api/types";
import {
  Button,
  CheckIcon,
  EmptyState,
  PageHeader,
  QuestionIcon,
  StatusBadge,
} from "../../components";
import { useLoad } from "../../state/useLoad";
import { scriptClass, type Lang } from "../../theme/script";
import { TEACHER_NAV } from "./nav";

const NAV = TEACHER_NAV;

const TASK = {
  letters: { name: "Letters", ask: "Point to each letter. The child says its sound.", pass: "4 of 5" },
  words: { name: "Words", ask: "The child reads each word aloud.", pass: "4 of 5" },
  paragraph: { name: "Paragraph", ask: "The child reads the paragraph aloud.", pass: "85%" },
  story: { name: "Story", ask: "The child reads the story aloud.", pass: "85%" },
} as const;

export const LEVEL_TEXT: Record<Level, { name: string; means: string }> = {
  beginner: { name: "Beginner", means: "not yet reading letters" },
  letter: { name: "Letter", means: "reads letters, not yet words" },
  word: { name: "Word", means: "reads words, not yet a paragraph" },
  paragraph: { name: "Paragraph", means: "reads a paragraph, not yet a longer story" },
  story: { name: "Story", means: "reads a story" },
};

const NEXT_MARK: Record<MarkState, MarkState> = {
  correct: "error",
  error: "correct",
  unsure: "correct",
};

/** A placement mark, drawn with the reading marks (book.css): right, missed, not sure. */
const MARK: Record<MarkState, "correct" | "skipped" | "uncertain"> = {
  correct: "correct",
  error: "skipped",
  unsure: "uncertain",
};
const MARK_SAID: Record<MarkState, string> = {
  correct: "right",
  error: "missed",
  unsure: "not sure",
};

/**
 * Placement, the ASER way: the teacher sits with the child, who reads letters, words, a
 * paragraph or a story. Each item can be recorded and scored, or marked by ear; either way the
 * teacher taps a mark to change it before confirming, since single letters are where speech
 * recognition is weakest.
 */
export function PlacementScreen() {
  const { childId } = useParams<{ childId: string }>();
  const id = Number(childId);
  const navigate = useNavigate();
  const child = useLoad(() => api.getChild(id), [id]);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || Number.isNaN(id)) return;
    started.current = true;
    api.startPlacement(id).then(setPlacement, () => setFailed("Could not start the placement."));
  }, [id]);

  const name = child.data?.alias.split(" ")[0] ?? "the child";

  return (
    <>
      <PageHeader back backTo={`/teacher/child/${id}`} nav={NAV} />
      <div className="register-page">
        <div className="register-head">
          <h1 className="register-head__title">Find {name}’s reading level</h1>
        </div>

        {failed || child.error ? (
          <EmptyState title={failed ?? "Child not found"}>
            <Link className="screen__link" to="/teacher">
              Back to class
            </Link>
          </EmptyState>
        ) : !placement || !child.data ? (
          <p className="note" role="status">
            Getting the first item ready…
          </p>
        ) : placement.item ? (
          <Step
            key={placement.done.length}
            placement={placement}
            lang={child.data.language}
            onAnswered={setPlacement}
          />
        ) : (
          <Result
            placement={placement}
            name={name}
            onDone={() => navigate(`/teacher/child/${id}`)}
          />
        )}
      </div>
    </>
  );
}

function Step({
  placement,
  lang,
  onAnswered,
}: {
  placement: Placement;
  lang: Lang;
  onAnswered: (p: Placement) => void;
}) {
  const item = placement.item!;
  const task = TASK[item.task];
  const [marks, setMarks] = useState<MarkState[] | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "recording" | "checking" | "saving">("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const recorder = useRef<Recorder | null>(null);

  useEffect(() => () => recorder.current?.cancel(), []);

  async function mic() {
    setProblem(null);
    if (phase === "recording") {
      const rec = recorder.current;
      recorder.current = null;
      setPhase("checking");
      try {
        const audio = await rec!.stop();
        const read = await api.readPlacement(placement.id, audio);
        setMarks(read.states);
        setHeard(read.transcript);
      } catch (e) {
        setProblem(
          e instanceof RecordingError
            ? "Nothing was heard. Check the microphone, or mark by ear."
            : statusOf(e) === 503 || statusOf(e) === 502
              ? "The speech service did not answer. Mark by ear instead."
              : "Could not check the recording. Try again, or mark by ear.",
        );
      }
      setPhase("idle");
      return;
    }
    try {
      const rec = createRecorder();
      await rec.start();
      recorder.current = rec;
      setPhase("recording");
    } catch {
      setProblem("The microphone is not available. Mark by ear instead.");
    }
  }

  async function confirm() {
    if (!marks) return;
    setPhase("saving");
    try {
      onAnswered(await api.answerPlacement(placement.id, marks));
    } catch {
      setProblem("Could not save. Try again.");
      setPhase("idle");
    }
  }

  const right = marks?.filter((m) => m === "correct").length ?? 0;
  const unsure = marks?.filter((m) => m === "unsure").length ?? 0;
  const spaced = item.task === "letters" || item.task === "words";

  return (
    <>
      {/* One status sentence: which step, what the child does, what passes. */}
      <p className="register-status">
        <strong>
          Step {placement.done.length + 1} · {task.name}.
        </strong>{" "}
        {task.ask} Passes at {task.pass} right. Read once, without help.
      </p>

      {placement.done.length > 0 && <DoneSteps placement={placement} />}

      <article className="book-page book-page--teacher">
        {!marks ? (
          <p
            className={`reading ${scriptClass(lang)} ${spaced ? "reading--spaced" : ""}`}
            lang={lang}
          >
            {item.text}
          </p>
        ) : (
          <>
            <p className="sounds__label" role="status">
              Tap a word to change its mark · {right} of {marks.length} right
              {unsure ? ` · ${unsure} unsure` : ""}
            </p>
            <p
              className={`marked ${scriptClass(lang)} ${spaced ? "marked--spaced" : ""}`}
              lang={lang}
              role="group"
              aria-label="Marks"
            >
              {item.words.map((w, i) => (
                <span key={i}>
                  <button
                    type="button"
                    className="mark mark--still"
                    data-status={MARK[marks[i]]}
                    aria-label={`${w}: ${MARK_SAID[marks[i]]}. Tap to change.`}
                    // From the latest marks, so quick taps in a row all count.
                    onClick={() =>
                      setMarks((prev) => prev && prev.map((m, k) => (k === i ? NEXT_MARK[m] : m)))
                    }
                  >
                    <span className="mark__word">{w}</span>
                    <span className="mark__sign" aria-hidden="true">
                      {MARK[marks[i]] === "correct" ? (
                        <CheckIcon width={16} height={16} />
                      ) : MARK[marks[i]] === "uncertain" ? (
                        <QuestionIcon width={16} height={16} />
                      ) : null}
                    </span>
                  </button>{" "}
                </span>
              ))}
            </p>
            {heard !== null && (
              <p className="heard__line">
                Heard:{" "}
                <span className={scriptClass(lang)} lang={lang}>
                  {heard || "nothing"}
                </span>
              </p>
            )}
          </>
        )}
      </article>

      {!marks ? (
        <div className="register-actions">
          <Button
            icon={phase === "recording" ? "none" : "mic"}
            onClick={mic}
            disabled={phase === "checking" || phase === "saving"}
            aria-pressed={phase === "recording"}
          >
            {phase === "recording"
              ? "Stop recording"
              : phase === "checking"
                ? "Checking…"
                : "Record the child reading"}
          </Button>
          <button
            type="button"
            className="link-button"
            onClick={() => setMarks(item.words.map(() => "correct"))}
            disabled={phase !== "idle"}
          >
            Mark by ear instead
          </button>
        </div>
      ) : (
        <div className="register-actions">
          <Button onClick={confirm} disabled={phase === "saving"}>
            {phase === "saving" ? "Saving…" : "Confirm and continue"}
          </Button>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setMarks(null);
              setHeard(null);
            }}
          >
            Start this item again
          </button>
        </div>
      )}

      {problem && (
        <p className="field__error" role="alert">
          {problem}
        </p>
      )}
    </>
  );
}

/** The items done so far, as ruled rows. */
function DoneSteps({ placement }: { placement: Placement }) {
  return (
    <div className="register">
      <table className="register__table">
        <tbody>
          {placement.done.map((d, i) => (
            <tr key={i} className="register__row">
              <td>
                <strong>
                  {i + 1}. {TASK[d.task].name}
                </strong>
              </td>
              <td className="num">
                {d.states.filter((x) => x === "correct").length} of {d.states.length} right
              </td>
              <td>{d.outcome === "open" ? "one more item" : d.outcome}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Result({
  placement,
  name,
  onDone,
}: {
  placement: Placement;
  name: string;
  onDone: () => void;
}) {
  const level = LEVEL_TEXT[placement.level ?? "beginner"];
  return (
    <>
      <p className="register-status">
        Reading step <strong>{level.name}</strong>
        {placement.uncertain && (
          <>
            {" "}
            <StatusBadge tone="warning">Listen again</StatusBadge>
          </>
        )}
        . {name} {level.means}. Stories will start at this step and move up as {name} reads well.
        {placement.uncertain && (
          <span className="register-status__goal">
            Some words were hard to judge from the recording. Listen to {name} read once more
            before relying on this step.
          </span>
        )}
      </p>
      <DoneSteps placement={placement} />
      <div className="register-actions">
        <Button onClick={onDone}>Back to {name}</Button>
      </div>
    </>
  );
}
