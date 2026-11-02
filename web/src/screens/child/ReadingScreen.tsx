import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, isMock } from "../../api";
import {
  MAX_RECORDING_S,
  MOCK_DURATIONS,
  RecordingError,
  createRecorder,
  wavSeconds,
  type Recorder,
} from "../../api/mock";
import {
  Action,
  BookPage,
  ChildFrame,
  Kolam,
  MicIcon,
  StopIcon,
  pictureOf,
} from "../../components";
import { coverFor } from "../../data/covers";
import { meterValue } from "../../audio/noise";
import { newId } from "../../state/ids";
import { load as loadChild } from "../../state/storage";
import { useSession } from "../../state/session";
import { LANGS, scriptClass, type Lang } from "../../theme/script";

const isLang = (l: string): l is Lang => (LANGS as readonly string[]).includes(l);
import { useCopy, type CopyKey } from "../../i18n";

/** requesting: waiting for mic permission; processing: turning the clip into a WAV. */
type Phase = "idle" | "requesting" | "recording" | "processing";

const PROBLEM_TEXT: Record<RecordingError["problem"], CopyKey> = {
  silent: "read.silent",
  short: "read.short",
};

export function ReadingScreen() {
  const { lang, reader, passage, parts, currentPart, setPending, beginPassage, setLang } = useSession();
  const navigate = useNavigate();
  const { passageId } = useParams();

  // Opened from a link or a reload: the session is empty, so load the story the URL names.
  useEffect(() => {
    if (passage || !passageId) return;
    let live = true;
    api
      .getPassage(passageId)
      .then((p) => {
        if (!live) return;
        if (isLang(p.language)) setLang(p.language);
        beginPassage(p, api.partsOf(p));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [passage, passageId, beginPassage, setLang]);
  const { t, Tx } = useCopy(lang);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<CopyKey | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const recorder = useRef<Recorder | null>(null);
  const startedAt = useRef(0);
  const finishRef = useRef<() => void>(() => {});

  // Elapsed seconds while recording: the only live feedback the child gets. The backend takes
  // at most MAX_RECORDING_S, so the recording stops itself there and is sent as it is.
  useEffect(() => {
    if (phase !== "recording") return;
    const timer = setInterval(() => {
      const s = (Date.now() - startedAt.current) / 1000;
      setElapsed(Math.floor(s));
      const db = recorder.current?.level();
      if (db != null) setLevel(meterValue(db));
      if (s >= MAX_RECORDING_S) finishRef.current();
    }, 100);
    return () => clearInterval(timer);
  }, [phase]);

  // Leaving the screen mid-reading must not leave the microphone on.
  useEffect(() => () => recorder.current?.cancel(), []);

  const total = Math.max(parts.length, 1);
  const text = parts[currentPart - 1]?.text ?? passage?.text ?? "";

  function handOver(seconds: number, audio: Blob | null, noisy = false) {
    // The id is fixed here, so every later send of this clip (a retry, or the offline queue)
    // is answered with the same stored result.
    setPending({ audio, seconds, noisy, requestId: newId() });
    navigate("/checking");
  }

  async function finish() {
    const rec = recorder.current;
    if (!rec) return;
    recorder.current = null;
    setPhase("processing");
    try {
      const audio = await rec.stop();
      // The clip's own length, as the server measures it, so child and teacher see one WCPM.
      handOver(wavSeconds(audio), audio, rec.noise === "noisy");
    } catch (e) {
      setError(e instanceof RecordingError ? PROBLEM_TEXT[e.problem] : "read.failed");
      setPhase("idle");
    }
  }
  finishRef.current = () => void finish();

  async function onMic() {
    if (phase === "recording") return finish();
    if (phase !== "idle") return; // a second tap while the permission prompt is up
    setPhase("requesting");
    try {
      const rec = createRecorder();
      await rec.start();
      recorder.current = rec;
      startedAt.current = Date.now();
      setElapsed(0);
      setError(null);
      setPhase("recording");
    } catch {
      setPhase("idle");
      navigate("/recovery/microphone");
    }
  }

  const idle = phase === "idle" || phase === "requesting";
  const art = passage ? coverFor(passage) : null;
  const me = reader ?? loadChild().reader;

  return (
    <ChildFrame
      lang={lang}
      lineKey={phase === "recording" ? "voice.listening" : idle ? "read.readAloud" : "read.checking"}
      level={phase === "recording" ? level : undefined}
      mark={me ? pictureOf(me.id, me.picture) : null}
      title="Reading"
      heading
      action={
        <>
          <Action
            icon={phase === "recording" ? <StopIcon /> : <MicIcon />}
            aria-pressed={phase === "recording"}
            disabled={phase === "requesting" || phase === "processing"}
            onClick={onMic}
          >
            <Tx k={idle ? "read.tapToStart" : phase === "recording" ? "read.recording" : "read.checking"} />
          </Action>
          {isMock && phase === "idle" && (
            <button
              type="button"
              className="action-aside"
              onClick={() => handOver(MOCK_DURATIONS[currentPart - 1] ?? 12, null)}
            >
              <Tx k="read.demoReading" />
            </button>
          )}
        </>
      }
    >
      <BookPage art={art} artFrom={passage?.title} lang={lang} fallback={passage ? <Kolam seed={passage.id} progress={(currentPart - 1) / total} /> : null}>
        <p className={`reading ${scriptClass(lang)}`} lang={lang}>
          {text || <Tx k="recovery.noStory" />}
        </p>
        <div className="page-foot">
          <span className="part-dots" role="img" aria-label={t("common.part", { n: currentPart, total })}>
            {parts.map((_, i) => (
              <i key={i} data-done={i < currentPart - 1} data-here={i === currentPart - 1} />
            ))}
          </span>
          {phase === "recording" && (
            /* role="timer" is not announced every tick, unlike aria-live. */
            <span className="page-foot__timer num" role="timer" aria-label={`Recording, ${elapsed} s`}>
              {elapsed}s
            </span>
          )}
        </div>
        {error && (
          <p className="field__error" role="alert">
            <Tx k={error} />
          </p>
        )}
      </BookPage>
    </ChildFrame>
  );
}
