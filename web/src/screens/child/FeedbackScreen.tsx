import { useNavigate } from "react-router-dom";
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
  PageHeader,
  WordChip,
  wordStatus,
} from "../../components";
import { useSession } from "../../state/session";
import { scriptClass } from "../../theme/script";
import { flowCopy } from "./copy";

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
        <PageHeader back backTo="/home" />
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
      <PageHeader back backTo="/home" />
      <div className="feedback-hero">
        <h1 className={`feedback-hero__title ${scriptClass(lang)}`} lang={lang}>
          {copy.wellRead} <StarIcon className="inline-icon" />
        </h1>
        <p className="feedback-hero__sub">Child · Evaluated demo · Part {currentPart}</p>
      </div>

      <div className="screen-body">
        <div className="workspace workspace--w360">
          {/* Left: part context and the honesty notice. */}
          <div className="stack">
            <div className="context">
              <div className="context__row">
                <span>
                  {currentPart} of {total}
                </span>
                <span>{Math.round(part.attempt.accuracy * 100)}% correct</span>
              </div>
              <ProgressBar value={(currentPart / total) * 100} label="Reading progress" />
            </div>

            <div className="metarow">
              <LanguageBadge lang={lang} />
              <span className="reader-meta">
                Your reading · Part {currentPart} of {total}
              </span>
            </div>

            <p className="banner">{part.attempt.notice}</p>
          </div>

          {/* Right: the words and what to practise. */}
          <div className="stack">
            <div className="chips">
              {words.map((w, i) => (
                <WordChip
                  key={`${w.index ?? i}-${w.word ?? ""}`}
                  status={wordStatus(w)}
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

            {missed.length > 0 && (
              <div className="practice">
                <p className="practice__eyebrow">
                  <EarIcon className="inline-icon" /> Listen and say · Timbre
                </p>
                {missed.map((w, i) => (
                  <div className="practice__row" key={`${w.word}-${i}`}>
                    <span className={`reading-text ${scriptClass(lang)}`} lang={lang}>{w.word}</span>
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
        </div>
      </div>
    </>
  );
}
