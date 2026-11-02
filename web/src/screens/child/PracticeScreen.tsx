import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, childIdOf, isMock } from "../../api";
import { RecordingError, createRecorder, type Recorder } from "../../api/mock";
import type { MarkState } from "../../api/types";
import { meterValue } from "../../audio/noise";
import { playToEnd } from "../../audio/playback";
import {
  Action,
  AksharaTile,
  ArrowRightIcon,
  CheckIcon,
  ChildFrame,
  FlagIcon,
  MicIcon,
  Slate,
  StarIcon,
  StopIcon,
  pictureOf,
} from "../../components";
import type { PictureName } from "../../components/pictureShapes";
import { useCopy, type CopyKey } from "../../i18n";
import { useSession } from "../../state/session";
import { load as loadChild } from "../../state/storage";
import type { Lang } from "../../theme/script";

/** At most this many words after a reading: enough to help, short enough for a Class 2 child. */
export const PRACTICE_WORDS = 3;
const TRIES = 2;

type Phase = "listening" | "ready" | "recording" | "checking" | "done";

/**
 * Akshara practice, on the slate. For each missed word: the word arrives in chalk, splits into
 * its aksharas, Timbre says each one (its tile lifts in turmeric), the tiles slide back
 * together and the whole word is said; then the child reads the word. Read right, it turns
 * leaf. The re-read is scored on its own and teaches the child's learner model.
 */
export function PracticeScreen() {
  const { lang, reader, reset } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  // Demo mode also takes the words from the link (/practice?words=a,b), so the practice
  // moment can be opened directly when recording the demo.
  const linked = isMock
    ? (new URLSearchParams(location.search).get("words") ?? "").split(",").filter(Boolean)
    : [];
  const words = ((location.state as { words?: string[] } | null)?.words ?? linked).slice(
    0,
    PRACTICE_WORDS,
  );
  const { Tx } = useCopy(lang);
  const [index, setIndex] = useState(0);
  const me = reader ?? loadChild().reader;
  const mark = me ? pictureOf(me.id, me.picture) : null;
  // A child the teacher added can go on to a sentence (the saved reader, after a reload).
  const sentenceFor = childIdOf(me?.id);

  function finish() {
    reset();
    navigate("/home");
  }

  if (words.length === 0 || index >= words.length) {
    return (
      <ChildFrame
        lang={lang}
        lineKey="practice.done"
        vars={{ count: words.length }}
        title="Practice"
        mark={mark}
        surface="slate"
        heading
        action={
          <>
            <Action tone="turmeric" icon={<FlagIcon />} onClick={finish}>
              <Tx k="results.finish" />
            </Action>
            {sentenceFor !== undefined && (
              <button
                type="button"
                className="action-aside"
                onClick={() => navigate("/practice/sentence")}
              >
                <Tx k="sentence.start" />
              </button>
            )}
          </>
        }
      >
        <Slate>
          <StarIcon width={72} height={72} className="slate__star" aria-hidden="true" />
        </Slate>
      </ChildFrame>
    );
  }

  return (
    <Word
      key={index}
      word={words[index]}
      n={index + 1}
      total={words.length}
      lang={lang}
      mark={mark}
      childId={childIdOf(me?.id)}
      onNext={() => setIndex((i) => i + 1)}
    />
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** How long the tiles take to split or join (the --t-explain token); none in tests. */
const MOVE_MS = import.meta.env.MODE === "test" ? 0 : 450;

function problemOf(e: unknown): CopyKey {
  if (e instanceof RecordingError) return e.problem === "silent" ? "read.silent" : "read.short";
  return "practice.failed";
}

function Word({
  word,
  n,
  total,
  lang,
  mark,
  childId,
  onNext,
}: {
  word: string;
  n: number;
  total: number;
  lang: Lang;
  mark: PictureName | null;
  childId: number | undefined;
  onNext: () => void;
}) {
  const { t, Tx } = useCopy(lang);
  const [parts, setParts] = useState<string[]>([word]);
  const [lit, setLit] = useState<number | "all" | null>(null);
  const [joined, setJoined] = useState(true);
  const [phase, setPhase] = useState<Phase>("listening");
  const [result, setResult] = useState<MarkState | null>(null);
  const [tries, setTries] = useState(0);
  const [message, setMessage] = useState<CopyKey | null>(null);
  const [level, setLevel] = useState(0);
  const recorder = useRef<Recorder | null>(null);
  // One token per playback run: a newer run (or leaving the screen) stops the older one.
  const run = useRef(0);

  async function listen(split: string[]) {
    const mine = ++run.current;
    const live = () => run.current === mine;
    setPhase("listening");
    setMessage(null);
    setResult(null);
    setJoined(true);
    await wait(MOVE_MS);
    if (!live()) return;
    setJoined(false); // the word breaks into its aksharas
    await wait(MOVE_MS);
    for (let i = 0; i < split.length && live(); i++) {
      setLit(i);
      await playToEnd(split[i], lang);
    }
    if (!live()) return;
    setLit(null);
    setJoined(true); // and slides back together
    await wait(MOVE_MS);
    if (!live()) return;
    setLit("all");
    await playToEnd(word, lang);
    if (!live()) return;
    setLit(null);
    setPhase("ready");
  }

  useEffect(() => {
    let cancelled = false;
    api
      .aksharas(word, lang)
      .catch(() => [word])
      .then((split) => {
        if (cancelled) return;
        setParts(split);
        void listen(split);
      });
    return () => {
      cancelled = true;
      run.current += 1; // stops a playback in progress
      recorder.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, lang]);

  // The voice control's ring follows the microphone while the child reads the word.
  useEffect(() => {
    if (phase !== "recording") return;
    const timer = setInterval(() => {
      const db = recorder.current?.level();
      if (db != null) setLevel(meterValue(db));
    }, 120);
    return () => clearInterval(timer);
  }, [phase]);

  async function judge(audio: Blob | null) {
    setPhase("checking");
    try {
      const r = await api.practise(audio, word, lang, childId);
      const tried = tries + 1;
      setTries(tried);
      setResult(r.state);
      if (r.state === "correct") setMessage("practice.great");
      else setMessage(tried >= TRIES ? "practice.moveOn" : "practice.again");
      setPhase(r.state === "correct" || tried >= TRIES ? "done" : "ready");
    } catch (e) {
      setMessage(problemOf(e));
      setPhase("ready");
    }
  }

  async function mic() {
    if (phase === "recording") {
      const rec = recorder.current;
      recorder.current = null;
      setPhase("checking");
      try {
        await judge(await rec!.stop());
      } catch (e) {
        setMessage(problemOf(e));
        setPhase("ready");
      }
      return;
    }
    if (phase !== "ready") return;
    setMessage(null);
    try {
      const rec = createRecorder();
      await rec.start();
      recorder.current = rec;
      setPhase("recording");
    } catch {
      setMessage("recovery.microphone.title");
    }
  }

  const ok = result === "correct";
  const line: CopyKey =
    message ??
    (phase === "listening"
      ? "practice.listen"
      : phase === "recording"
        ? "voice.listening"
        : "practice.yourTurn");
  const actionKey: CopyKey =
    phase === "listening"
      ? "practice.listen"
      : phase === "checking"
        ? "practice.checking"
        : phase === "recording"
          ? "read.recording"
          : "read.tapToStart";

  return (
    <ChildFrame
      lang={lang}
      lineKey={line}
      title="Practice"
      mark={mark}
      surface="slate"
      level={phase === "recording" ? level : undefined}
      heading
      action={
        phase === "done" ? (
          <Action tone="turmeric" icon={<ArrowRightIcon />} onClick={onNext}>
            <Tx k="practice.next" />
          </Action>
        ) : (
          <>
            <Action
              tone="turmeric"
              icon={phase === "recording" ? <StopIcon /> : <MicIcon />}
              aria-pressed={phase === "recording"}
              disabled={phase === "listening" || phase === "checking"}
              onClick={mic}
            >
              <Tx k={actionKey} />
            </Action>
            {phase === "ready" && (
              <div className="action-asides">
                <button type="button" className="action-aside" onClick={() => void listen(parts)}>
                  <Tx k="practice.listen" />
                </button>
                {isMock && (
                  <button type="button" className="action-aside" onClick={() => void judge(null)}>
                    <Tx k="read.demoReading" />
                  </button>
                )}
              </div>
            )}
          </>
        )
      }
    >
      <Slate>
        <p className="slate__count">
          <Tx k="practice.wordOf" vars={{ n, total }} />
        </p>
        <div
          className="tiles"
          data-joined={joined}
          data-long={parts.length > 5}
          data-state={ok ? "ok" : undefined}
          role="img"
          aria-label={word}
          lang={lang}
          style={{ "--n": parts.length } as CSSProperties}
        >
          {parts.map((a, i) => (
            <AksharaTile
              key={`${parts.length}-${i}`}
              akshara={a}
              lang={lang}
              index={i}
              state={ok ? "ok" : lit === i || lit === "all" ? "lit" : "idle"}
            />
          ))}
        </div>
        <span className="slate__tick" aria-hidden={!ok}>
          {ok && <CheckIcon width={40} height={40} aria-label={t("chip.correct")} />}
        </span>
      </Slate>
    </ChildFrame>
  );
}
