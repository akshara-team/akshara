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
  ListenButton,
  MicButton,
  ProgressBar,
  ProgressDots,
  PageHeader,
} from "../../components";
import { useSession } from "../../state/session";
import { scriptClass } from "../../theme/script";
import { flowCopy } from "./copy";

/** requesting: waiting for mic permission; processing: turning the clip into a WAV. */
type Phase = "idle" | "requesting" | "recording" | "processing";

const PROBLEM_TEXT: Record<RecordingError["problem"], string> = {
  silent: "We could not hear you. Check the microphone is on, then read again.",
  short: "That was very short. Tap the mic, read the whole part, then tap again.",
};

export function ReadingScreen() {
  const { lang, passage, parts, currentPart, setPending } = useSession();
  const navigate = useNavigate();
  const copy = flowCopy(lang);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
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
      if (s >= MAX_RECORDING_S) finishRef.current();
    }, 250);
    return () => clearInterval(timer);
  }, [phase]);

  // Leaving the screen mid-reading must not leave the microphone on.
  useEffect(() => () => recorder.current?.cancel(), []);

  const total = Math.max(parts.length, 1);
  const text = parts[currentPart - 1]?.text ?? passage?.text ?? "No passage loaded.";

  function handOver(seconds: number, audio: Blob | null) {
    setPending({ audio, seconds });
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
      handOver(wavSeconds(audio), audio);
    } catch (e) {
      setError(
        e instanceof RecordingError
          ? PROBLEM_TEXT[e.problem]
          : "Could not read the recording. Try again.",
      );
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
  const label = idle ? copy.tapToStart : phase === "recording" ? copy.recording : copy.listening;
  const desc = idle ? copy.readAloud : copy.readPace;
  const title = passage?.title ?? copy.storyTitle;
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
                  {passage?.level
                    ? `Child reading · Level ${passage.level}`
                    : "Child reading · Demo story"}
                </span>
                <span className={`metarow__title ${scriptClass(lang)}`} lang={lang}>
                  {title}
                </span>
              </div>
            </div>

            <div className="context">
              <div className="context__row">
                <span>{copy.partOf(currentPart, total)}</span>
                <ProgressDots total={total} current={currentPart} />
              </div>
              <ProgressBar value={(currentPart / total) * 100} label="Reading progress" />
            </div>

            <ListenButton text={text} lang={lang} label={copy.listen} block />
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
                Story from{" "}
                {passage.credit.url ? (
                  <a href={passage.credit.url} target="_blank" rel="noreferrer">
                    {passage.credit.publisher}
                  </a>
                ) : (
                  passage.credit.publisher
                )}
                {passage.credit.licence ? ` · ${passage.credit.licence.split(" (")[0]}` : ""}
              </p>
            )}

            <div className="controls">
              <MicButton
                state={micState}
                onClick={onMic}
                label={label}
              />
              <p className="controls__label">{label}</p>
              {phase === "recording" && (
                // role="timer" is not announced every tick, unlike aria-live.
                <p className="controls__timer" role="timer" aria-label={`Recording, ${elapsed} s`}>
                  {elapsed}s
                </p>
              )}
              <p className="controls__desc">{desc}</p>

              {error && (
                <p className="field__error" role="alert">
                  {error}
                </p>
              )}

              {isMock && phase === "idle" && (
                <Button
                  variant="ghost"
                  onClick={() => handOver(MOCK_DURATIONS[currentPart - 1] ?? 12, null)}
                >
                  Use demo reading
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
