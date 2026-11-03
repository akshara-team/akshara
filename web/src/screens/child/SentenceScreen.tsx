import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, childIdOf, isMock } from "../../api";
import { RecordingError, createRecorder, type Recorder } from "../../api/mock";
import type { SentenceFor, SentenceRead } from "../../api/types";
import {
  Action,
  BookPage,
  ChildFrame,
  FlagIcon,
  MarkedText,
  MicIcon,
  StopIcon,
  pictureOf,
} from "../../components";
import { meterValue } from "../../audio/noise";
import { play } from "../../audio/playback";
import { useCopy, type CopyKey } from "../../i18n";
import { useSession } from "../../state/session";
import { load as loadChild } from "../../state/storage";
import { scriptClass } from "../../theme/script";

type Phase = "loading" | "none" | "ready" | "recording" | "checking" | "done";

/**
 * After practising words: one sentence that uses the sound the child is working on. Approved
 * Evon sentences first, else a sentence from a story (`GET /v1/children/{id}/sentence`). The
 * child listens (Timbre), reads it aloud (Prisma), and sees each word.
 */
export function SentenceScreen() {
  const { lang, reader, reset } = useSession();
  const navigate = useNavigate();
  const { Tx } = useCopy(lang);
  const childId = childIdOf((reader ?? loadChild().reader)?.id);
  const [sentence, setSentence] = useState<SentenceFor | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [result, setResult] = useState<SentenceRead | null>(null);
  const [message, setMessage] = useState<CopyKey | null>(null);
  const recorder = useRef<Recorder | null>(null);

  useEffect(() => {
    if (childId === undefined) {
      setPhase("none");
      return;
    }
    let alive = true;
    api
      .sentenceFor(childId)
      .then((s) => {
        if (!alive) return;
        setSentence(s);
        setPhase("ready");
      })
      .catch(() => alive && setPhase("none"));
    return () => {
      alive = false;
    };
  }, [childId]);

  useEffect(() => () => recorder.current?.cancel(), []);

  // The voice control's ring follows the microphone while the child reads.
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (phase !== "recording") return;
    const timer = setInterval(() => {
      const db = recorder.current?.level();
      if (db != null) setLevel(meterValue(db));
    }, 100);
    return () => clearInterval(timer);
  }, [phase]);

  function finish() {
    reset();
    navigate("/home");
  }

  async function judge(audio: Blob | null) {
    if (!sentence) return;
    setPhase("checking");
    try {
      setResult(await api.readSentence(sentence.id, audio, childId));
      setMessage(null);
      setPhase("done");
    } catch {
      setMessage("practice.failed");
      setPhase("ready");
    }
  }

  async function mic() {
    if (phase === "recording") {
      const rec = recorder.current;
      recorder.current = null;
      try {
        await judge(await rec!.stop());
      } catch (e) {
        const silent = e instanceof RecordingError && e.problem === "silent";
        setMessage(e instanceof RecordingError ? (silent ? "read.silent" : "read.short") : "practice.failed");
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

  const me = reader ?? loadChild().reader;
  const mark = me ? pictureOf(me.id, me.picture) : null;

  if (phase === "none") {
    return (
      <ChildFrame
        lang={lang}
        lineKey="sentence.none"
        title="Practice"
        mark={mark}
        heading
        action={
          <Action icon={<FlagIcon />} onClick={finish}>
            <Tx k="results.finish" />
          </Action>
        }
      >
        {null}
      </ChildFrame>
    );
  }

  const words = (result?.words ?? []).filter((w) => w.op !== "inserted");
  const done = phase === "done";
  const line: CopyKey = done
    ? result && result.accuracy >= 0.99
      ? "sentence.great"
      : "sentence.good"
    : phase === "recording"
      ? "voice.listening"
      : "sentence.title";

  return (
    <ChildFrame
      lang={lang}
      lineKey={message ?? line}
      title="Practice"
      mark={mark}
      level={phase === "recording" ? level : undefined}
      heading
      action={
        done ? (
          <Action icon={<FlagIcon />} onClick={finish}>
            <Tx k="results.finish" />
          </Action>
        ) : (
          <>
            <Action
              icon={phase === "recording" ? <StopIcon /> : <MicIcon />}
              aria-pressed={phase === "recording"}
              disabled={phase === "loading" || phase === "checking"}
              onClick={mic}
            >
              <Tx
                k={
                  phase === "checking"
                    ? "practice.checking"
                    : phase === "recording"
                      ? "read.recording"
                      : "read.tapToStart"
                }
              />
            </Action>
            {phase === "ready" && sentence && (
              <div className="action-asides">
                <button
                  type="button"
                  className="action-aside"
                  onClick={() => void play(sentence.text, lang)}
                >
                  <Tx k="common.listen" />
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
      <BookPage className="book-page--sentence">
        {phase === "loading" || !sentence ? (
          <p className="page-hint" role="status">
            <Tx k="home.opening" />
          </p>
        ) : done ? (
          <MarkedText words={words} lang={lang} />
        ) : (
          <p className={`reading ${scriptClass(lang)}`} lang={lang}>
            {sentence.text}
          </p>
        )}
      </BookPage>
    </ChildFrame>
  );
}
