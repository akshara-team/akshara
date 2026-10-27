import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  ListenButton,
  RepeatIcon,
  SparklesIcon,
  StatCard,
  PageHeader,
  TrendingUpIcon,
} from "../../components";
import { useSession } from "../../state/session";
import { addReading, buildReading } from "../../state/storage";
import { scriptClass } from "../../theme/script";
import { NIPUN_BAND } from "../../api/teacherData";
import { useCopy } from "../../i18n";
import { load } from "../../state/storage";
import { PRACTICE_WORDS } from "./PracticeScreen";
import { storyTitle } from "./title";

export function ResultsScreen() {
  const { lang, passage, parts, sessionId, reset } = useSession();
  const navigate = useNavigate();
  const { t, Tx } = useCopy(lang);
  const saved = useRef(false);
  // Earlier readings on this device, before this one is saved: the child's own journey.
  const [earlier] = useState(() =>
    load()
      .readings.filter((r) => r.id !== sessionId && r.wcpm != null)
      .slice(0, 2)
      .reverse(),
  );

  const read = parts.filter((p) => p.attempt);
  const words = read.flatMap((p) => p.attempt?.words ?? []);
  const totalWords = words.length;
  const correct = words.filter((w) => w.op === "correct").length;
  const seconds = read.reduce((sum, p) => sum + (p.seconds ?? 0), 0);
  const accuracy = totalWords ? correct / totalWords : 0;
  const wcpm = seconds > 0 ? Math.round((correct / seconds) * 60) : null;
  const missed = words.filter((w) => w.op === "substituted" || w.op === "skipped");
  // The first few different words the child missed, in reading order.
  const practise = [...new Set(missed.map((w) => w.word).filter((w): w is string => !!w))].slice(
    0,
    PRACTICE_WORDS,
  );

  // Record the reading once, so the child's home can show it later.
  useEffect(() => {
    if (saved.current || !sessionId || !passage) return;
    const reading = buildReading({
      id: sessionId,
      passageId: passage.id,
      storyTitle: storyTitle(passage),
      language: lang,
      parts,
    });
    if (!reading) return;
    saved.current = true;
    addReading(reading);
  }, [sessionId, passage, parts, lang]);

  function finish() {
    reset();
    navigate("/home");
  }

  return (
    <>
      <PageHeader back backTo="/home" />
      <div className="screen-body">
        <div className="workspace workspace--w360">
          {/* Left: celebration and the two headline numbers. */}
          <div className="stack">
            <p className={`eyebrow ${scriptClass(lang)}`} lang={lang}>
              {storyTitle(passage)}
            </p>

            <div className="stack--tight stack">
              <h1 className="card__title">
                <Tx k="results.title" /> <SparklesIcon className="inline-icon" />
              </h1>
              <p className="reader-meta">
                <Tx k={accuracy >= 0.8 ? "feedback.wellRead" : "feedback.keepGoing"} />
              </p>
            </div>

            <div className="stats-grid">
              <StatCard label={t("results.speed")} value={wcpm == null ? "—" : String(wcpm)} />
              <StatCard label={t("results.accuracy")} value={`${Math.round(accuracy * 100)}%`} />
            </div>
          </div>

          {/* Right: progress, practice and the way out. */}
          <div className="stack">
            <div className="progress-note">
              <p className="eyebrow">
                <Tx k="results.progress" /> <TrendingUpIcon className="inline-icon" />
              </p>
              {earlier.length ? (
                <span className="progress-note__journey">
                  {[...earlier.map((r) => Math.round(r.wcpm ?? 0)), wcpm ?? "—"].join(" → ")}
                </span>
              ) : (
                <span className="note">
                  <Tx k="results.firstTime" />
                </span>
              )}
              <div className="nipun">
                <span className="nipun__pill">
                  <Tx k="results.target" vars={{ min: NIPUN_BAND.min, max: NIPUN_BAND.max }} />
                </span>
              </div>
            </div>

            {missed.length > 0 && (
              <div className="practice">
                <p className="practice__eyebrow">
                  <Tx k="results.practise" /> <RepeatIcon className="inline-icon" />
                </p>
                {missed.map((w, i) => (
                  <div className="practice__row" key={`${w.word}-${i}`}>
                    <span className={`reading-text ${scriptClass(lang)}`} lang={lang}>{w.word}</span>
                    <ListenButton uiLang={lang} text={w.word ?? ""} lang={lang} label={t("common.listen")} />
                  </div>
                ))}
              </div>
            )}

            <p className="note">
              <Tx k="results.adults" />
            </p>

            <div className="actions">
              {practise.length > 0 && (
                <Button block onClick={() => navigate("/practice", { state: { words: practise } })}>
                  <Tx k="practice.start" />
                </Button>
              )}
              <Button variant={practise.length ? "ghost" : "primary"} block onClick={finish}>
                <Tx k="results.finish" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
