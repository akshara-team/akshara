import { useNavigate, useParams } from "react-router-dom";
import { Action, BookPage, ChildFrame, buttonIcon, pictureOf } from "../../components";
import { useSession } from "../../state/session";
import { load as loadChild } from "../../state/storage";
import { useCopy } from "../../i18n";
import { scriptClass } from "../../theme/script";
import { storyTitle } from "../child/title";
import { recoveryVariant } from "./config";

/**
 * One screen for every recoverable failure: microphone permission, offline, speech-recognition
 * failure, service error, loading and connection delay. A child screen like any other: the
 * problem as the screen's line, what to do on a page, one action. The story in progress stays
 * named, so the child knows nothing was lost.
 */
export function RecoveryScreen() {
  const { kind } = useParams<{ kind: string }>();
  const navigate = useNavigate();
  const { lang, reader, passage, currentPart, parts } = useSession();
  const v = recoveryVariant(kind);
  const total = Math.max(parts.length, 1);
  const { Tx } = useCopy(lang);
  const me = reader ?? loadChild().reader;
  // "/read" in the config means "this story again"; the route needs the passage id.
  const go = (to: string) =>
    navigate(to === "/read" ? (passage ? `/read/${passage.id}` : "/home") : to);

  return (
    <ChildFrame
      lang={lang}
      lineKey={v.subtitle ?? v.title}
      title="Recovery"
      mark={me ? pictureOf(me.id, me.picture) : null}
      action={
        <>
          <Action icon={buttonIcon(v.primary.icon ?? "none")} onClick={() => go(v.primary.to)}>
            <Tx k={v.primary.label} />
          </Action>
          {v.secondary && (
            <button type="button" className="action-aside" onClick={() => go(v.secondary!.to)}>
              <Tx k={v.secondary.label} />
            </button>
          )}
        </>
      }
    >
      <h1 className={`display ${scriptClass(lang)}`} lang={lang}>
        <Tx k={v.title} />
      </h1>
      <BookPage className="book-page--note">
        {v.steps && (
          <ol className="steps-list">
            {v.steps.map((step, i) => (
              <li key={step}>
                <span className="steps-list__num num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className={scriptClass(lang)} lang={lang}>
                  <Tx k={step} />
                </span>
              </li>
            ))}
          </ol>
        )}
        {v.note && (
          <p className="page-note">
            <Tx k={v.note} />
          </p>
        )}
        <p className={`page-hint ${scriptClass(lang)}`} lang={lang}>
          {passage ? (
            <>
              {storyTitle(passage)} · <Tx k="recovery.part" vars={{ n: currentPart, total }} />
            </>
          ) : (
            <Tx k="recovery.noStory" />
          )}
        </p>
      </BookPage>
    </ChildFrame>
  );
}
