import { useLocation, useNavigate } from "react-router-dom";
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
  SayButton,
} from "../../components";
import { useSession } from "../../state/session";
import { scriptClass } from "../../theme/script";
import { useCopy } from "../../i18n";

export function FeedbackScreen() {
  const { lang, passage, parts, currentPart, goToNextPart } = useSession();
  const navigate = useNavigate();
  const noisy = Boolean((useLocation().state as { noisy?: boolean } | null)?.noisy);
  const { t, Tx } = useCopy(lang);

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
          <p className="note">
            <Tx k="feedback.nothing" />
          </p>
          <div className="actions">
            <Button block icon="previous" onClick={() => navigate(`/read/${passage?.id ?? ""}`)}>
              <Tx k="feedback.backToReading" />
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
        <h1 className="feedback-hero__title">
          <Tx k={part.attempt.accuracy >= 0.8 ? "feedback.wellRead" : "feedback.keepGoing"} />{" "}
          <StarIcon className="inline-icon" />
        </h1>
        <div className="say-row say-row--center">
          <p className="feedback-hero__sub">
            <Tx k="common.part" vars={{ n: currentPart, total }} />
          </p>
          <SayButton k="feedback.listenAndSay" lang={lang} />
        </div>
        {noisy && (
          <p className="feedback-hero__sub feedback-hero__noisy">
            <Tx k="feedback.noisy" />
          </p>
        )}
      </div>

      <div className="screen-body">
        <div className="workspace workspace--w360">
          {/* Left: part context and the honesty notice. */}
          <div className="stack">
            <div className="context">
              <div className="context__row">
                <Tx k="common.part" vars={{ n: currentPart, total }} />
                <Tx
                  k="feedback.percent"
                  vars={{ percent: Math.round(part.attempt.accuracy * 100) }}
                />
              </div>
              <ProgressBar
                value={(currentPart / total) * 100}
                label={t("common.part", { n: currentPart, total })}
              />
            </div>

            <div className="metarow">
              <LanguageBadge lang={lang} />
              <span className="reader-meta">
                <Tx k="common.part" vars={{ n: currentPart, total }} />
              </span>
            </div>

            <p className="banner">
              <Tx k="feedback.notice" />
            </p>
          </div>

          {/* Right: the words and what to practise. */}
          <div className="stack">
            <div className="chips">
              {words.map((w, i) => (
                <WordChip uiLang={lang}
                  key={`${w.index ?? i}-${w.word ?? ""}`}
                  status={wordStatus(w)}
                  word={w.word ?? ""}
                  lang={lang}
                />
              ))}
            </div>

            <div className="legend">
              <span>
                <CheckIcon className="inline-icon" /> <Tx k="feedback.legendCorrect" />
              </span>
              <span>
                <SwapIcon className="inline-icon" /> <Tx k="feedback.legendDifferent" />
              </span>
              <span>
                <MinusIcon className="inline-icon" /> <Tx k="feedback.legendSkipped" />
              </span>
              <span>
                <QuestionIcon className="inline-icon" /> <Tx k="feedback.legendCheck" />
              </span>
            </div>

            {missed.length > 0 && (
              <div className="practice">
                <p className="practice__eyebrow">
                  <EarIcon className="inline-icon" /> <Tx k="feedback.listenAndSay" />
                </p>
                {missed.map((w, i) => (
                  <div className="practice__row" key={`${w.word}-${i}`}>
                    <span className={`reading-text ${scriptClass(lang)}`} lang={lang}>{w.word}</span>
                    <ListenButton uiLang={lang} text={w.word ?? ""} lang={lang} label={t("common.listen")} />
                  </div>
                ))}
              </div>
            )}

            <div className="actions">
              <Button block icon={isLast ? "results" : "next"} onClick={next}>
                <Tx
                  k={isLast ? "feedback.seeResults" : "feedback.next"}
                  vars={{ n: currentPart + 1 }}
                />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
