import { useNavigate } from "react-router-dom";
import type { WordOut } from "../../api/types";
import {
  Button,
  CheckIcon,
  EarIcon,
  LanguageBadge,
  ListenButton,
  MinusIcon,
  ProgressBar,
  QuestionIcon,
  StarIcon,
  SwapIcon,
  TopBar,
  WordChip,
  type WordStatus,
} from "../../components";
import { useSession } from "../../state/session";
import { scriptClass } from "../../theme/script";
import { flowCopy } from "./copy";

function statusOf(w: WordOut): WordStatus {
  if (w.check) return "uncertain";
  if (w.op === "substituted") return "substituted";
  if (w.op === "skipped") return "skipped";
  return "correct";
}

export function FeedbackScreen() {
  const { lang, passage, parts, currentPart, goToNextPart } = useSession();
  const navigate = useNavigate();
  const copy = flowCopy(lang);

  const total = Math.max(parts.length, 1);
  const part = parts[currentPart - 1];
  const words = (part?.attempt?.words ?? []).filter((w) => w.op !== "inserted");
  const missed = words.filter((w) => w.op === "substituted" || w.op === "skipped");
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
      <>
        <TopBar back backTo="/reader" />
        <div className="screen-body">
          <p className="note">Nothing to show yet — read a part first.</p>
          <div className="actions">
            <Button block onClick={() => navigate(`/read/${passage?.id ?? ""}`)}>
              Back to reading
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar back backTo="/reader" />
      <div className="feedback-hero">
        <h1 className={`feedback-hero__title ${scriptClass(lang)}`}>
          {copy.wellRead} <StarIcon className="inline-icon" />
        </h1>
        <p className="feedback-hero__sub">
          Child · Evaluated demo · Part {currentPart}
        </p>
      </div>

      <div className="screen-body">
        <div className="context">
          <div className="context__row">
            <span>
              {currentPart} of {total}
            </span>
            <span>{Math.round(part.attempt.accuracy * 100)}% correct</span>
          </div>
          <ProgressBar value={(currentPart / total) * 100} />
        </div>

        <div className="metarow">
          <LanguageBadge lang={lang} />
          <span className="reader-meta">
            Your reading · Part {currentPart} of {total}
          </span>
        </div>

        <div className="chips">
          {words.map((w, i) => (
            <WordChip
              key={`${w.index ?? i}-${w.word ?? ""}`}
              status={statusOf(w)}
              word={w.word ?? ""}
              lang={lang}
            />
          ))}
        </div>

        <div className="legend">
          <span>
            <CheckIcon className="inline-icon" /> read correctly
          </span>
          <span>
            <SwapIcon className="inline-icon" /> read as a different word
          </span>
          <span>
            <MinusIcon className="inline-icon" /> skipped
          </span>
          <span>
            <QuestionIcon className="inline-icon" /> check this word
          </span>
        </div>

        <p className="note">{part.attempt.notice}</p>

        {missed.length > 0 && (
          <div className="practice">
            <p className="practice__eyebrow">
              <EarIcon className="inline-icon" /> Listen and say · Timbre
            </p>
            {missed.map((w, i) => (
              <div className="practice__row" key={`${w.word}-${i}`}>
                <span className={`reading-text ${scriptClass(lang)}`}>{w.word}</span>
                <ListenButton text={w.word ?? ""} lang={lang} label={copy.listen} />
              </div>
            ))}
          </div>
        )}

        <div className="actions">
          <Button block onClick={next}>
            {isLast ? "See results" : copy.continueToPart(currentPart + 1)}
          </Button>
        </div>
      </div>
    </>
  );
}
