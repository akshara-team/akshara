import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, childIdOf, isMock } from "../../api";
import { ApiError } from "../../api/live";
import {
  Action,
  ArrowRightIcon,
  CheckIcon,
  ChildFrame,
  HomeIcon,
  Kolam,
  RepeatIcon,
  StarIcon,
  pictureOf,
} from "../../components";
import { enqueue } from "../../state/outbox";
import { useSession } from "../../state/session";
import { useCopy } from "../../i18n";
import { scriptClass } from "../../theme/script";
import { storyTitle } from "./title";

type Failure = "offline" | "speech" | "service";

/** The demo answers instantly; it waits this long so the checking kolam is seen (not in tests). */
const DEMO_WAIT_MS = isMock && import.meta.env.MODE !== "test" ? 1800 : 0;

function classify(error: unknown): Failure {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
  // The backend answers 502 when Prisma fails (src/akshara/api/app.py); 503 from a proxy.
  if (error instanceof ApiError) {
    return error.status === 502 || error.status === 503 ? "speech" : "service";
  }
  if (error instanceof TypeError) return "offline"; // fetch could not reach the server
  return "service";
}

/**
 * The design's "Checking your reading" screen. It owns the API call after a
 * recording, then routes to feedback or the matching recovery screen.
 */
export function CheckingScreen() {
  const {
    lang,
    reader,
    passage,
    parts,
    currentPart,
    pending,
    sessionId,
    recordAttempt,
    setPending,
    goToNextPart,
  } = useSession();
  const navigate = useNavigate();
  const started = useRef(false);
  const [failed, setFailed] = useState<Failure | null>(null);
  const [saved, setSaved] = useState(false);

  const total = Math.max(parts.length, 1);
  const { Tx } = useCopy(lang);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!pending) {
      navigate(passage ? `/read/${passage.id}` : "/home", { replace: true });
      return;
    }

    const send = {
      learner: reader?.alias ?? "learner-1",
      childId: childIdOf(reader?.id),
      session: sessionId ?? undefined,
      passageId: passage?.id ?? "unknown",
      title: passage?.title ?? null,
      lang,
      partIndex: currentPart - 1,
      requestId: pending.requestId,
    };

    (async () => {
      try {
        const [attempt] = await Promise.all([
          api.submitAttempt({
            ...send,
            audio: pending.audio ?? new Blob([], { type: "audio/wav" }),
          }),
          // The demo answers at once; hold the kolam long enough to be seen.
          new Promise((r) => setTimeout(r, DEMO_WAIT_MS)),
        ]);
        recordAttempt(currentPart - 1, attempt, pending.seconds);
        setPending(null);
        navigate("/feedback", { replace: true, state: { noisy: Boolean(pending.noisy) } });
      } catch (error) {
        const why = classify(error);
        // No connection: keep the reading and send it later (state/outbox.ts). Live mode
        // needs the audio to do that; the demo's readings have none.
        if (why === "offline" && pending.requestId && (pending.audio || isMock)) {
          try {
            await enqueue({ ...send, requestId: pending.requestId, audio: pending.audio, at: Date.now() });
            setPending(null);
            setSaved(true);
            return;
          } catch {
            /* the browser would not store it: fall back to "read again" */
          }
        }
        setFailed(why);
      }
    })();
  }, [pending, reader, passage, lang, currentPart, sessionId, recordAttempt, setPending, navigate]);

  const mark = reader ? pictureOf(reader.id, reader.picture) : null;

  if (saved) {
    const isLast = currentPart >= total;
    const anyChecked = parts.some((p) => p.attempt);
    return (
      <ChildFrame
        lang={lang}
        lineKey="check.savedTitle"
        title="Checking"
        mark={mark}
        action={
          !isLast ? (
            <Action
              icon={<ArrowRightIcon />}
              onClick={() => {
                goToNextPart();
                navigate(`/read/${passage?.id ?? ""}`, { replace: true });
              }}
            >
              <Tx k="feedback.next" vars={{ n: currentPart + 1 }} />
            </Action>
          ) : anyChecked ? (
            <Action icon={<StarIcon />} onClick={() => navigate("/results", { replace: true })}>
              <Tx k="feedback.seeResults" />
            </Action>
          ) : (
            <Action icon={<HomeIcon />} onClick={() => navigate("/home", { replace: true })}>
              <Tx k="common.home" />
            </Action>
          )
        }
      >
        <div className="center-stage">
          <h1 className={`display ${scriptClass(lang)}`} lang={lang}>
            <Tx k="check.savedTitle" /> <CheckIcon className="inline-icon" />
          </h1>
          <p className="note" role="status">
            <Tx k="check.savedBody" />
          </p>
        </div>
      </ChildFrame>
    );
  }

  if (failed) {
    return (
      <ChildFrame
        lang={lang}
        lineKey="check.failed"
        title="Checking"
        mark={mark}
        action={
          <>
            <Action icon={<RepeatIcon />} onClick={() => navigate(passage ? `/read/${passage.id}` : "/home", { replace: true })}>
              <Tx k="check.readAgain" />
            </Action>
            <button type="button" className="action-aside" onClick={() => navigate(`/recovery/${failed}`, { replace: true })}>
              <Tx k="check.whatToDo" />
            </button>
          </>
        }
      >
        <div className="center-stage">
          <h1 className={`display ${scriptClass(lang)}`} lang={lang}>
            <Tx k="check.failed" />
          </h1>
          <p className="note">
            <Tx k={`check.${failed}`} />
          </p>
        </div>
      </ChildFrame>
    );
  }

  return (
    <ChildFrame lang={lang} lineKey="voice.thinking" title="Checking" mark={mark}>
      <div className="center-stage checking-stage" role="status">
        <Kolam seed={passage?.id ?? "akshara"} mode="loop" className="checking-stage__kolam" />
        <h1 className={`display ${scriptClass(lang)}`} lang={lang}>
          <Tx k="check.greatJob" />
        </h1>
        <p className={`center-stage__sub ${scriptClass(lang)}`} lang={lang}>
          {storyTitle(passage)} · <Tx k="common.part" vars={{ n: currentPart, total }} />
        </p>
      </div>
    </ChildFrame>
  );
}
