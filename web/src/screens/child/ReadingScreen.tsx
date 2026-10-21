import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isMock } from "../../api";
import { MOCK_DURATIONS, createRecorder, type Recorder } from "../../api/mock";
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

type Phase = "idle" | "recording";

export function ReadingScreen() {
  const { lang, passage, parts, currentPart, setPending } = useSession();
  const navigate = useNavigate();
  const copy = flowCopy(lang);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const recorder = useRef<Recorder | null>(null);
  const startedAt = useRef(0);

  // Elapsed seconds while recording: the only live feedback the child gets.
  useEffect(() => {
    if (phase !== "recording") return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 250);
    return () => clearInterval(timer);
  }, [phase]);

  const total = Math.max(parts.length, 1);
  const text = parts[currentPart - 1]?.text ?? passage?.text ?? "No passage loaded.";

  function handOver(seconds: number, audio: Blob | null) {
    setPending({ audio, seconds });
    navigate("/checking");
  }

  async function onMic() {
    if (phase === "recording") {
      const seconds = (Date.now() - startedAt.current) / 1000;
      try {
        const audio = await recorder.current?.stop();
        recorder.current = null;
        handOver(seconds, audio ?? null);
      } catch {
        setError("Could not read the recording. Try again.");
        setPhase("idle");
      }
      return;
    }
    try {
      const rec = createRecorder();
      await rec.start();
      recorder.current = rec;
      startedAt.current = Date.now();
      setElapsed(0);
      setError(null);
      setPhase("recording");
    } catch {
      navigate("/recovery/microphone");
    }
  }

  const label = phase === "idle" ? copy.tapToStart : copy.recording;
  const desc = phase === "idle" ? copy.readAloud : copy.readPace;

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
                <span className="eyebrow">Child reading · Demo story</span>
                <span className={`metarow__title ${scriptClass(lang)}`} lang={lang}>
                  {copy.storyTitle}
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

            <div className="controls">
              <MicButton state={phase} onClick={onMic} label={label} />
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
