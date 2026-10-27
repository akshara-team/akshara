import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, childIdOf, isMock } from "../../api";
import { ApiError } from "../../api/live";
import { Button, LanguageBadge, ProgressDots, Spinner, PageHeader } from "../../components";
import { useSession } from "../../state/session";
import { useCopy } from "../../i18n";
import { scriptClass } from "../../theme/script";
import { storyTitle } from "./title";

type Failure = "offline" | "speech" | "service";

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
  } = useSession();
  const navigate = useNavigate();
  const started = useRef(false);
  const [failed, setFailed] = useState<Failure | null>(null);

  const total = Math.max(parts.length, 1);
  const { t, Tx } = useCopy(lang);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!pending) {
      navigate(passage ? `/read/${passage.id}` : "/home", { replace: true });
      return;
    }

    (async () => {
      try {
        const attempt = await api.submitAttempt({
          audio: pending.audio ?? new Blob([], { type: "audio/wav" }),
          learner: reader?.alias ?? "learner-1",
          childId: childIdOf(reader?.id),
          session: sessionId ?? undefined,
          passageId: passage?.id ?? "unknown",
          title: passage?.title ?? null,
          lang,
          partIndex: currentPart - 1,
        });
        recordAttempt(currentPart - 1, attempt, pending.seconds);
        setPending(null);
        navigate("/feedback", { replace: true });
      } catch (error) {
        setFailed(classify(error));
      }
    })();
  }, [pending, reader, passage, lang, currentPart, sessionId, recordAttempt, setPending, navigate]);

  if (failed) {
    return (
      <>
        <PageHeader back backTo="/home" />
        <div className="screen-body">
          <h1 className="recovery-hero__title">
            <Tx k="check.failed" />
          </h1>
          <p className="note">
            <Tx k={`check.${failed}`} />
          </p>
          <div className="actions">
            <Button block onClick={() => navigate(`/recovery/${failed}`, { replace: true })}>
              <Tx k="check.whatToDo" />
            </Button>
            <Button
              variant="ghost"
              block
              onClick={() => navigate(passage ? `/read/${passage.id}` : "/home", { replace: true })}
            >
              <Tx k="check.readAgain" />
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader back={false} />
      <div className="screen-body">
        <div className="workspace workspace--w360">
          {/* Left: story and part context. */}
          <div className="stack">
            <div className="metarow">
              <LanguageBadge lang={lang} />
              <div className="metarow__text">
                <span className="eyebrow">
                  <Tx k="check.title" />
                </span>
                <span className={`metarow__title ${scriptClass(lang)}`} lang={lang}>
                  {storyTitle(passage)}
                </span>
              </div>
            </div>

            <div className="context">
              <div className="context__row">
                <Tx k="common.part" vars={{ n: currentPart, total }} />
                <ProgressDots total={total} current={currentPart} />
              </div>
            </div>
          </div>

          {/* Right: the wait itself. */}
          <div className="stack">
            <div className="checking">
              <Spinner label={t("check.heard")} />
              <h1 className="recovery-hero__title">
                <Tx k="check.greatJob" />
              </h1>
              <p className="note">
                <Tx k="check.heard" />
              </p>
              <p className="note">
                <Tx k="check.soon" />
              </p>
            </div>

            <div className="passage-card">
              <div className="passage-card__accent" aria-hidden="true" />
              <p className={`reading-text ${scriptClass(lang)}`} lang={lang}>
                {parts[currentPart - 1]?.text ?? ""}
              </p>
            </div>

            {isMock && (
              <p className="note">
                Demo mode: results come from fixtures, so this finishes instantly.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
