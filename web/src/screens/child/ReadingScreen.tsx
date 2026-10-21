import { useRef, useState } from "react";
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
  TopBar,
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
  const recorder = useRef<Recorder | null>(null);
  const startedAt = useRef(0);

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
      <TopBar back backTo="/reader" />
      <div className="screen-body">
        <div className="metarow">
          <LanguageBadge lang={lang} />
          <div className="metarow__text">
            <span className="eyebrow">Child reading · Demo story</span>
            <span className={`metarow__title ${scriptClass(lang)}`}>{copy.storyTitle}</span>
          </div>
        </div>

        <div className="context">
          <div className="context__row">
            <span>{copy.partOf(currentPart, total)}</span>
            <ProgressDots total={total} current={currentPart} />
          </div>
          <ProgressBar value={(currentPart / total) * 100} />
        </div>

        <div className="passage-card">
          <div className="passage-card__accent" aria-hidden="true" />
          <p className={`reading-text ${scriptClass(lang)}`}>{text}</p>
        </div>

        <div className="controls">
          <ListenButton text={text} lang={lang} label={copy.listen} />
          <MicButton state={phase} onClick={onMic} label={label} />
          <p className="controls__label">{label}</p>
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
    </>
  );
}
