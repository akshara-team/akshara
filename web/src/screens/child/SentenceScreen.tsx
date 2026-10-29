import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, childIdOf, isMock } from "../../api";
import { RecordingError, createRecorder, type Recorder } from "../../api/mock";
import type { SentenceFor, SentenceRead } from "../../api/types";
import { Button, ListenButton, MicButton, PageHeader, WordChip, wordStatus, SayButton } from "../../components";
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
  const { t, Tx } = useCopy(lang);
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

  if (phase === "none") {
    return (
      <>
        <PageHeader back backTo="/home" />
        <div className="screen-body">
          <div className="checking">
            <h1 className="recovery-hero__title">
              <Tx k="sentence.none" />
            </h1>
            <div className="actions">
              <Button block icon="finish" onClick={finish}>
                <Tx k="results.finish" />
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const words = (result?.words ?? []).filter((w) => w.op !== "inserted");
  return (
    <>
      <PageHeader back backTo="/home" />
      <div className="screen-body">
        <div className="say-row">
          <h1 className="recovery-hero__title">
            <Tx k="sentence.title" />
          </h1>
          <SayButton k="say.sentence" lang={lang} />
        </div>
        {phase === "loading" || !sentence ? (
          <p className="note" role="status">
            <Tx k="home.opening" />
          </p>
        ) : (
          <div className="stack">
            <div className="passage-card">
              <div className="passage-card__accent" aria-hidden="true" />
              <p className={`reading-text ${scriptClass(lang)}`} lang={lang}>
                {sentence.text}
              </p>
            </div>

            {phase === "done" ? (
              <>
                <p className="practice-message" role="status">
                  <Tx k={result && result.accuracy >= 0.99 ? "sentence.great" : "sentence.good"} />
                </p>
                <div className="chips">
                  {words.map((w, i) => (
                    <WordChip
                      uiLang={lang}
                      key={`${w.index ?? i}-${w.word ?? ""}`}
                      status={wordStatus(w)}
                      word={w.word ?? ""}
                      lang={lang}
                    />
                  ))}
                </div>
                <div className="actions">
                  <Button block icon="finish" onClick={finish}>
                    <Tx k="results.finish" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="controls">
                <ListenButton uiLang={lang} text={sentence.text} lang={lang} label={t("common.listen")} />
                <MicButton
                  state={phase === "recording" ? "recording" : phase === "ready" ? "idle" : "processing"}
                  onClick={mic}
                  label={t(phase === "recording" ? "read.recording" : "read.tapToStart")}
                />
                <p className="controls__desc">
                  <Tx k={phase === "checking" ? "practice.checking" : phase === "recording" ? "read.recording" : "read.tapToStart"} />
                </p>
                {isMock && phase === "ready" && (
                  <Button variant="ghost" onClick={() => void judge(null)}>
                    <Tx k="read.demoReading" />
                  </Button>
                )}
              </div>
            )}
            {message && (
              <p className="note" role="status">
                <Tx k={message} />
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
