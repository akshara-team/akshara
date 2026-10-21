import { useNavigate, useParams } from "react-router-dom";
import { Button, LanguageBadge, TopBar } from "../../components";
import { useSession } from "../../state/session";
import { scriptClass } from "../../theme/script";
import { recoveryVariant } from "./config";

/**
 * One screen for every recoverable failure: microphone permission, offline,
 * speech-recognition failure, service error, loading and connection delay.
 * Keeps the reading context visible, per the design's recovery specification.
 */
export function RecoveryScreen() {
  const { kind } = useParams<{ kind: string }>();
  const navigate = useNavigate();
  const { lang, passage, currentPart, parts } = useSession();
  const v = recoveryVariant(kind);
  const total = Math.max(parts.length, 1);

  return (
    <>
      <TopBar back backTo="/reader" />
      <div className="recovery-hero">
        <h1 className="recovery-hero__title">{v.title}</h1>
        {v.subtitle && <p className="recovery-hero__sub">{v.subtitle}</p>}
      </div>

      <div className="screen-body">
        <div className="metarow">
          <LanguageBadge lang={lang} />
          <div className="metarow__text">
            <span className="eyebrow">Recovery · Demo state</span>
            <span className={`metarow__title ${scriptClass(lang)}`}>
              {passage ? passage.text.split(/\s+/).slice(0, 3).join(" ") : "No story loaded"}
            </span>
          </div>
        </div>

        <p className="note">Part {currentPart} of {total}</p>

        {v.steps && (
          <ol className="steps">
            {v.steps.map((step, i) => (
              <li className="steps__item" key={step}>
                <span className="steps__num">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        )}

        {v.note && <p className="note">{v.note}</p>}

        <div className="actions">
          <Button block onClick={() => navigate(v.primary.to)}>
            {v.primary.label}
          </Button>
          {v.secondary && (
            <Button variant="ghost" block onClick={() => navigate(v.secondary!.to)}>
              {v.secondary.label}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
