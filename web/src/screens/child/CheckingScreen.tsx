import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, isMock } from "../../api";
import { Button, LanguageBadge, ProgressDots, Spinner, PageHeader } from "../../components";
import { useSession } from "../../state/session";
import { scriptClass } from "../../theme/script";

type Failure = "offline" | "speech" | "service";

function classify(error: unknown): Failure {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("502") || message.includes("503")) return "speech";
  return "service";
}

/**
 * The design's "Checking your reading" screen. It owns the API call after a
 * recording, then routes to feedback or the matching recovery screen.
 */
export function CheckingScreen() {
  const { lang, reader, passage, parts, currentPart, pending, recordAttempt, setPending } =
    useSession();
  const navigate = useNavigate();
  const started = useRef(false);
  const [failed, setFailed] = useState<Failure | null>(null);

  const total = Math.max(parts.length, 1);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!pending) {
      navigate("/read", { replace: true });
      return;
    }

    (async () => {
      try {
        const attempt = await api.submitAttempt({
          audio: pending.audio ?? new Blob([], { type: "audio/wav" }),
          learner: reader?.alias ?? "learner-1",
          passageId: passage?.id ?? "unknown",
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
  }, [pending, reader, passage, lang, currentPart, recordAttempt, setPending, navigate]);

  if (failed) {
    return (
      <>
        <PageHeader back backTo="/home" />
        <div className="screen-body">
          <h1 className="recovery-hero__title">We could not finish checking</h1>
          <p className="note">
            {failed === "offline"
              ? "You appear to be offline."
              : failed === "speech"
                ? "The speech service did not answer."
                : "Something went wrong on our side."}
          </p>
          <div className="actions">
            <Button block onClick={() => navigate(`/recovery/${failed}`, { replace: true })}>
              Show me what to do
            </Button>
            <Button variant="ghost" block onClick={() => navigate("/read", { replace: true })}>
              Read this part again
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
                <span className="eyebrow">Child reading · Checking</span>
                <span className={`metarow__title ${scriptClass(lang)}`}>
                  {passage ? passage.text.split(/\s+/).slice(0, 3).join(" ") : "Your story"}
                </span>
              </div>
            </div>

            <div className="context">
              <div className="context__row">
                <span>
                  Part {currentPart} of {total} · Just finished
                </span>
                <ProgressDots total={total} current={currentPart} />
              </div>
            </div>
          </div>

          {/* Right: the wait itself. */}
          <div className="stack">
            <div className="checking">
              <Spinner label="Checking your reading now…" />
              <h1 className="recovery-hero__title">Great job!</h1>
              <p className="note">We heard you. Checking your reading now…</p>
              <p className="note">
                You read aloud — well done! Your result will appear in a moment.
              </p>
            </div>

            <div className="passage-card">
              <div className="passage-card__accent" aria-hidden="true" />
              <p className={`reading-text ${scriptClass(lang)}`}>
                {parts[currentPart - 1]?.text ?? "Your story"}
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
