import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, statusOf } from "../../api";
import { RecordingError, createRecorder, type Recorder } from "../../api/mock";
import type { Level, MarkState, Placement } from "../../api/types";
import {
  Button,
  Card,
  EmptyState,
  MicButton,
  PageHeader,
  StatusBadge,
  WordChip,
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

const CHIP: Record<MarkState, "correct" | "skipped" | "uncertain"> = {
  correct: "correct",
  error: "skipped",
  unsure: "uncertain",
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
      <div className="screen-body">
        <p className="eyebrow">Teacher · Reading level</p>
        <h1 className="card__title">Find {name}’s reading level</h1>

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

  return (
    <div className="workspace workspace--w320">
      <div className="stack">
        <Card>
          <p className="eyebrow">
            Step {placement.done.length + 1} · {task.name}
          </p>
          <p className="reader-name">{task.ask}</p>
          <p className="note">Passes at {task.pass} right. Read once, without help.</p>
        </Card>
        {placement.done.length > 0 && (
          <ol className="steps">
            {placement.done.map((d, i) => (
              <li className="steps__item" key={i}>
                <span className="steps__num">{i + 1}</span>
                <span>
                  {TASK[d.task].name}: {d.states.filter((s) => s === "correct").length} of{" "}
                  {d.states.length} right · {d.outcome === "open" ? "one more item" : d.outcome}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="stack">
        <div className="passage-card">
          <div className="passage-card__accent" aria-hidden="true" />
          <p
            className={`reading-text ${scriptClass(lang)} ${item.task === "letters" || item.task === "words" ? "reading-text--spaced" : ""}`}
            lang={lang}
          >
            {item.text}
          </p>
        </div>

        {!marks ? (
          <div className="controls">
            <MicButton
              state={phase === "recording" ? "recording" : phase === "idle" ? "idle" : "processing"}
              onClick={mic}
              label={phase === "recording" ? "Stop recording" : "Record the child reading"}
            />
            <p className="controls__label">
              {phase === "recording"
                ? "Recording · tap to stop"
                : phase === "checking"
                  ? "Checking…"
                  : "Record the child reading"}
            </p>
            <Button
              variant="ghost"
              onClick={() => setMarks(item.words.map(() => "correct"))}
              disabled={phase !== "idle"}
            >
              Mark by ear instead
            </Button>
          </div>
        ) : (
          <>
            <p className="step__label">
              Tap a word to change its mark · {right} of {marks.length} right
              {unsure ? ` · ${unsure} unsure` : ""}
            </p>
            <div className="chips" role="group" aria-label="Marks">
              {item.words.map((w, i) => (
                <button
                  key={i}
                  type="button"
                  className="chip-button"
                  aria-label={`${w}: ${marks[i]}. Tap to change.`}
                  // From the latest marks, so quick taps in a row all count.
                  onClick={() =>
                    setMarks((prev) => prev && prev.map((m, k) => (k === i ? NEXT_MARK[m] : m)))
                  }
                >
                  <WordChip status={CHIP[marks[i]]} word={w} lang={lang} />
                </button>
              ))}
            </div>
            {heard !== null && (
              <p className="note">
                Heard:{" "}
                <span className={scriptClass(lang)} lang={lang}>
                  {heard || "nothing"}
                </span>
              </p>
            )}
            <div className="actions">
              <Button block onClick={confirm} disabled={phase === "saving"}>
                {phase === "saving" ? "Saving…" : "Confirm and continue"}
              </Button>
              <Button
                variant="ghost"
                block
                onClick={() => {
                  setMarks(null);
                  setHeard(null);
                }}
              >
                Start this item again
              </Button>
            </div>
          </>
        )}

        {problem && (
          <p className="field__error" role="alert">
            {problem}
          </p>
        )}
      </div>
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
    <div className="stack">
      <Card>
        <p className="eyebrow">Reading level</p>
        <p className="card__title">
          {level.name}{" "}
          {placement.uncertain && <StatusBadge tone="warning">Listen again</StatusBadge>}
        </p>
        <p className="note">
          {name} {level.means}. Stories will start at this level and move up as {name} reads
          well.
        </p>
        {placement.uncertain && (
          <p className="note">
            Some words were hard to judge from the recording. Listen to {name} read once more
            before relying on this level.
          </p>
        )}
      </Card>
      <ol className="steps">
        {placement.done.map((d, i) => (
          <li className="steps__item" key={i}>
            <span className="steps__num">{i + 1}</span>
            <span>
              {TASK[d.task].name}: {d.states.filter((s) => s === "correct").length} of{" "}
              {d.states.length} right · {d.outcome}
            </span>
          </li>
        ))}
      </ol>
      <div className="actions">
        <Button block onClick={onDone}>
          Back to {name}
        </Button>
      </div>
    </div>
  );
}
