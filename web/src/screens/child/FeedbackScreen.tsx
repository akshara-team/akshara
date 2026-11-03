import { useLocation, useNavigate } from "react-router-dom";
import {
  Action,
  ArrowLeftIcon,
  ArrowRightIcon,
  BookPage,
  ChildFrame,
  MarkedText,
  StarIcon,
  pictureOf,
} from "../../components";
import { coverFor } from "../../data/covers";
import { useSession } from "../../state/session";
import { load as loadChild } from "../../state/storage";
import { scriptClass } from "../../theme/script";
import { useCopy } from "../../i18n";

/**
 * The page comes back marked: every word where it stands, in reading order. Encouragement
 * for the child; the numbers are the teacher's.
 */
export function FeedbackScreen() {
  const { lang, reader, passage, parts, currentPart, goToNextPart } = useSession();
  const navigate = useNavigate();
  const noisy = Boolean((useLocation().state as { noisy?: boolean } | null)?.noisy);
  const { Tx } = useCopy(lang);
  const me = reader ?? loadChild().reader;
  const mark = me ? pictureOf(me.id, me.picture) : null;

  const total = Math.max(parts.length, 1);
  const part = parts[currentPart - 1];
  const words = (part?.attempt?.words ?? []).filter((w) => w.op !== "inserted");
  const isLast = currentPart >= total;

  function next() {
    if (isLast) {
      navigate("/results");
      return;
    }
    goToNextPart();
    navigate(`/read/${passage?.id ?? ""}`);
  }

  if (!part?.attempt) {
    return (
      <ChildFrame
        lang={lang}
        lineKey="feedback.nothing"
        title="Your reading"
        mark={mark}
        heading
        action={
          <Action icon={<ArrowLeftIcon />} onClick={() => navigate(`/read/${passage?.id ?? ""}`)}>
            <Tx k="feedback.backToReading" />
          </Action>
        }
      >
        {null}
      </ChildFrame>
    );
  }

  return (
    <ChildFrame
      lang={lang}
      lineKey={part.attempt.accuracy >= 0.8 ? "feedback.wellRead" : "feedback.keepGoing"}
      title="Your reading"
      mark={mark}
      heading
      action={
        <Action icon={isLast ? <StarIcon /> : <ArrowRightIcon />} onClick={next}>
          <Tx k={isLast ? "feedback.seeResults" : "feedback.next"} vars={{ n: currentPart + 1 }} />
        </Action>
      }
    >
      <BookPage
        art={passage ? coverFor(passage) : null}
        artFrom={passage?.title}
        lang={lang}
        className="book-page--marked"
      >
        <MarkedText words={words} lang={lang} />
        <p className={`page-hint ${scriptClass(lang)}`} lang={lang}>
          <Tx k="feedback.tapWord" />
        </p>
        {noisy && (
          <p className="page-hint">
            <Tx k="feedback.noisy" />
          </p>
        )}
      </BookPage>
    </ChildFrame>
  );
}
