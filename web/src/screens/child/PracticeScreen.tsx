import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, childIdOf, isMock } from "../../api";
import { RecordingError, createRecorder, type Recorder } from "../../api/mock";
import type { MarkState } from "../../api/types";
import { playToEnd } from "../../audio/playback";
import { Button, MicButton, PageHeader, SayButton } from "../../components";
import { useCopy, type CopyKey } from "../../i18n";
import { useSession } from "../../state/session";
import { load as loadChild } from "../../state/storage";
import { scriptClass } from "../../theme/script";

/** At most this many words after a reading: enough to help, short enough for a Class 2 child. */
export const PRACTICE_WORDS = 3;
const TRIES = 2;

type Phase = "listening" | "ready" | "recording" | "checking" | "done";

/**
 * Akshara practice. For each missed word: the word splits into its aksharas, Timbre says each
 * one (the tile lights up) and then the whole word, and the child reads the whole word again.
 * The re-read is scored on its own and teaches the child's learner model.
 */
export function PracticeScreen() {
  const { lang, reader, reset } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const words = ((location.state as { words?: string[] } | null)?.words ?? []).slice(
    0,
    PRACTICE_WORDS,
  );
  const { t, Tx } = useCopy(lang);
  const [index, setIndex] = useState(0);
  // A child the teacher added can go on to a sentence (the saved reader, after a reload).
  const sentenceFor = childIdOf((reader ?? loadChild().reader)?.id);

  function finish() {
    reset();
    navigate("/home");
  }

  if (words.length === 0 || index >= words.length) {
    return (
      <>
        <PageHeader back backTo="/home" />
        <div className="screen-body">
          <div className="checking">
            <h1 className="recovery-hero__title">
              <Tx k="practice.done" vars={{ count: words.length }} />
            </h1>
            <div className="actions">
              {sentenceFor !== undefined && (
                <Button block icon="book" onClick={() => navigate("/practice/sentence")}>
                  <Tx k="sentence.start" />
                </Button>
              )}
              <Button
                block
                icon="finish"
                variant={sentenceFor !== undefined ? "ghost" : "primary"}
                onClick={finish}
              >
                <Tx k="results.finish" />
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader back backTo="/home" />
      <div className="screen-body">
        <p className="eyebrow">
          <Tx k="practice.title" /> · <Tx k="practice.wordOf" vars={{ n: index + 1, total: words.length }} />
        </p>
        <Word
          key={index}
          word={words[index]}
          lang={lang}
          childId={childIdOf(reader?.id)}
          t={t}
          Tx={Tx}
          onNext={() => setIndex((i) => i + 1)}
        />
      </div>
    </>
  );
}

function Word({
  word,
  lang,
  childId,
  t,
  Tx,
  onNext,
}: {
  word: string;
  lang: Parameters<typeof useCopy>[0];
  childId: number | undefined;
  t: ReturnType<typeof useCopy>["t"];
  Tx: ReturnType<typeof useCopy>["Tx"];
  onNext: () => void;
}) {
  const [parts, setParts] = useState<string[]>([word]);
  const [lit, setLit] = useState<number | "all" | null>(null);
  const [phase, setPhase] = useState<Phase>("listening");
  const [result, setResult] = useState<MarkState | null>(null);
  const [tries, setTries] = useState(0);
  const [message, setMessage] = useState<CopyKey | null>(null);
  const recorder = useRef<Recorder | null>(null);
  // One token per playback run: a newer run (or leaving the screen) stops the older one.
  const run = useRef(0);

  async function listen(split: string[]) {
    const mine = ++run.current;
    const live = () => run.current === mine;
    setPhase("listening");
    for (let i = 0; i < split.length && live(); i++) {
      setLit(i);
      await playToEnd(split[i], lang);
    }
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

  async function judge(audio: Blob | null) {
    setPhase("checking");
    try {
      const r = await api.practise(audio, word, lang, childId);
      const n = tries + 1;
      setTries(n);
      setResult(r.state);
      if (r.state === "correct") setMessage("practice.great");
      else setMessage(n >= TRIES ? "practice.moveOn" : "practice.again");
      setPhase(r.state === "correct" || n >= TRIES ? "done" : "ready");
    } catch (e) {
      setMessage(
        e instanceof RecordingError ? (e.problem === "silent" ? "read.silent" : "read.short") : "practice.failed",
      );
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
        setMessage(e instanceof RecordingError ? (e.problem === "silent" ? "read.silent" : "read.short") : "practice.failed");
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

  const tone = result === "correct" ? "practice-tile--ok" : result ? "practice-tile--miss" : "";

  return (
    <div className="stack practice-word">
      <div className="practice-tiles" lang={lang} aria-label={word} role="img">
        {parts.map((a, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`practice-tile ${scriptClass(lang)} ${lit === i || lit === "all" ? "practice-tile--lit" : ""} ${tone}`}
          >
            {a}
          </span>
        ))}
      </div>

      <div className="say-row say-row--center">
        <p className="controls__label">
          <Tx k={phase === "listening" ? "practice.listen" : "practice.yourTurn"} />
        </p>
        {phase === "ready" && <SayButton k="say.practice" lang={lang} />}
      </div>

      {phase !== "done" ? (
        <div className="controls">
          <MicButton
            state={phase === "recording" ? "recording" : phase === "ready" ? "idle" : "processing"}
            onClick={mic}
            label={t(phase === "recording" ? "read.recording" : "read.tapToStart")}
          />
          <p className="controls__desc">
            <Tx k={phase === "checking" ? "practice.checking" : phase === "recording" ? "read.recording" : "read.tapToStart"} />
          </p>
          <Button variant="outline" icon="audio" onClick={() => void listen(parts)} disabled={phase !== "ready"}>
            <Tx k="practice.listen" />
          </Button>
          {isMock && phase === "ready" && (
            <Button variant="ghost" onClick={() => void judge(null)}>
              <Tx k="read.demoReading" />
            </Button>
          )}
        </div>
      ) : (
        <div className="actions">
          <Button block icon="next" onClick={onNext}>
            <Tx k="practice.next" />
          </Button>
        </div>
      )}

      {message && (
        <p className={result === "correct" ? "practice-message" : "note"} role="status">
          <Tx k={message} />
        </p>
      )}
    </div>
  );
}
