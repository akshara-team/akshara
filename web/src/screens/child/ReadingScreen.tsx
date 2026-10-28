import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isMock } from "../../api";
import {
  MAX_RECORDING_S,
  MOCK_DURATIONS,
  RecordingError,
  createRecorder,
  wavSeconds,
  type Recorder,
} from "../../api/mock";
import {
  Button,
  LanguageBadge,
  LevelMeter,
  ListenButton,
  MicButton,
  NoiseCheck,
  ProgressBar,
  ProgressDots,
  PageHeader,
} from "../../components";
import { meterValue } from "../../audio/noise";
import { newId } from "../../state/ids";
import { useSession } from "../../state/session";
import { scriptClass } from "../../theme/script";
import { useCopy, type CopyKey } from "../../i18n";
import { storyTitle } from "./title";

/** requesting: waiting for mic permission; processing: turning the clip into a WAV. */
type Phase = "idle" | "requesting" | "recording" | "processing";

const PROBLEM_TEXT: Record<RecordingError["problem"], CopyKey> = {
  silent: "read.silent",
  short: "read.short",
};

export function ReadingScreen() {
  const { lang, passage, parts, currentPart, setPending } = useSession();
  const navigate = useNavigate();
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
    }, 250);
    return () => clearInterval(timer);
  }, [phase]);

  // Leaving the screen mid-reading must not leave the microphone on.
  useEffect(() => () => recorder.current?.cancel(), []);

  const total = Math.max(parts.length, 1);
  const text = parts[currentPart - 1]?.text ?? passage?.text ?? "No passage loaded.";

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
  const labelKey: CopyKey = idle
    ? "read.tapToStart"
    : phase === "recording"
      ? "read.recording"
      : "read.checking";
  const title = storyTitle(passage);
  const micState = phase === "recording" ? "recording" : phase === "idle" ? "idle" : "processing";

  return (
    <>
      <PageHeader back backTo="/home" />
      <div className="screen-body">
        <div className="workspace workspace--w360">
          {/* Left: story and part context, plus Listen. */}
          <div className="stack">
            <div className="metarow">
              <LanguageBadge lang={lang} />
              <div className="metarow__text">
                <span className="eyebrow">
                  <Tx k="read.eyebrow" />
                </span>
                <span className={`metarow__title ${scriptClass(lang)}`} lang={lang}>
                  {title}
                </span>
              </div>
            </div>

            <div className="context">
              <div className="context__row">
                <Tx k="common.part" vars={{ n: currentPart, total }} />
                <ProgressDots total={total} current={currentPart} />
              </div>
              <ProgressBar
                value={(currentPart / total) * 100}
                label={t("common.part", { n: currentPart, total })}
              />
            </div>

            <ListenButton uiLang={lang} text={text} lang={lang} label={t("common.listen")} block />
          </div>

          {/* Right: the passage and the mic. */}
          <div className="stack">
            <div className="passage-card">
              <div className="passage-card__accent" aria-hidden="true" />
              <p className={`reading-text ${scriptClass(lang)}`} lang={lang}>
                {text}
              </p>
            </div>
            {passage?.credit?.publisher && (
              <p className="note">
                {passage.credit.url ? (
                  <a href={passage.credit.url} target="_blank" rel="noreferrer">
                    <Tx k="read.storyFrom" vars={{ publisher: passage.credit.publisher }} />
                  </a>
                ) : (
                  <Tx k="read.storyFrom" vars={{ publisher: passage.credit.publisher }} />
                )}
                {passage.credit.licence ? ` · ${passage.credit.licence.split(" (")[0]}` : ""}
              </p>
            )}

            <div className="controls">
              <MicButton
                state={micState}
                onClick={onMic}
                label={t(labelKey)}
              />
              <p className="controls__label">
                <Tx k={labelKey} />
              </p>
              {phase === "recording" && (
                <>
                  {/* role="timer" is not announced every tick, unlike aria-live. */}
                  <p className="controls__timer" role="timer" aria-label={`Recording, ${elapsed} s`}>
                    {elapsed}s
                  </p>
                  <LevelMeter value={level} label={t("read.level")} />
                </>
              )}
              <p className="controls__desc">
                <Tx k={idle ? "read.readAloud" : "read.readPace"} />
              </p>

              {error && (
                <p className="field__error" role="alert">
                  <Tx k={error} />
                </p>
              )}

              {phase === "idle" && <NoiseCheck lang={lang} />}

              {isMock && phase === "idle" && (
                <Button
                  variant="ghost"
                  onClick={() => handOver(MOCK_DURATIONS[currentPart - 1] ?? 12, null)}
                >
                  <Tx k="read.demoReading" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
