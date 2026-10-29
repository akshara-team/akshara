import { useEffect, useRef, useState } from "react";
import { MIC_CONSTRAINTS, openMeter } from "../audio/meter";
import { meterValue, roomVerdict } from "../audio/noise";
import { useCopy } from "../i18n";
import type { Lang } from "../theme/script";
import { Button } from "./Button";
import { LevelMeter } from "./LevelMeter";

const LISTEN_MS = 2000;
const STEP_MS = 100;

type State = "idle" | "listening" | "quiet" | "noisy";

/**
 * "Is it quiet here?": listens to the room for two seconds before reading, shows the level,
 * and says whether it is quiet. Only on a tap, so the microphone never opens by itself. A
 * warning, never a block: the child can read either way.
 */
export function NoiseCheck({ lang }: { lang: Lang }) {
  const { t, Tx } = useCopy(lang);
  const [state, setState] = useState<State>("idle");
  const [level, setLevel] = useState(0);
  const stop = useRef<() => void>(() => {});

  useEffect(() => () => stop.current(), []);

  async function listen() {
    if (state === "listening") return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
    } catch {
      setState("idle"); // no microphone or no permission: the mic button explains that
      return;
    }
    const meter = openMeter(stream);
    const levels: number[] = [];
    setState("listening");
    const started = Date.now();
    const timer = setInterval(() => {
      const db = meter?.level();
      if (db != null) {
        levels.push(db);
        setLevel(meterValue(db));
      }
      if (Date.now() - started >= LISTEN_MS) {
        stop.current();
        setState(roomVerdict(levels));
      }
    }, STEP_MS);
    stop.current = () => {
      clearInterval(timer);
      meter?.close();
      stream.getTracks().forEach((track) => track.stop());
      stop.current = () => {};
    };
  }

  return (
    <div className="noise-check">
      {state !== "listening" && (
        <Button variant="ghost" icon="quiet" onClick={() => void listen()}>
          <Tx k="read.noiseCheck" />
        </Button>
      )}
      {state === "listening" && (
        <>
          <p className="note" role="status">
            <Tx k="read.noiseListening" />
          </p>
          <LevelMeter value={level} label={t("read.level")} />
        </>
      )}
      {(state === "quiet" || state === "noisy") && (
        <p className={`noise-check__verdict noise-check__verdict--${state}`} role="status">
          <Tx k={state === "quiet" ? "read.noiseQuiet" : "read.noiseNoisy"} />
        </p>
      )}
    </div>
  );
}
