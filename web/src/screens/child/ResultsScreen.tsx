import { useEffect, useRef } from "react";
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
import { flowCopy } from "./copy";

export function ResultsScreen() {
  const { lang, passage, parts, sessionId, reset } = useSession();
  const navigate = useNavigate();
  const copy = flowCopy(lang);
  const saved = useRef(false);

  const read = parts.filter((p) => p.attempt);
  const words = read.flatMap((p) => p.attempt?.words ?? []);
  const totalWords = words.length;
  const correct = words.filter((w) => w.op === "correct").length;
  const seconds = read.reduce((sum, p) => sum + (p.seconds ?? 0), 0);
  const accuracy = totalWords ? correct / totalWords : 0;
  const wcpm = seconds > 0 ? Math.round((correct / seconds) * 60) : null;
  const missed = words.filter((w) => w.op === "substituted" || w.op === "skipped");

  // Record the reading once, so the child's home can show it later.
  useEffect(() => {
    if (saved.current || !sessionId || !passage) return;
    const reading = buildReading({
      id: sessionId,
      passageId: passage.id,
      storyTitle: copy.storyTitle,
      language: lang,
      parts,
    });
    if (!reading) return;
    saved.current = true;
    addReading(reading);
  }, [sessionId, passage, parts, lang, copy.storyTitle]);

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
            <p className="eyebrow">Child · Demo attempt · 19 Oct 2026</p>

            <div className="stack--tight stack">
              <h1 className="card__title">
                You read the whole story! <SparklesIcon className="inline-icon" />
              </h1>
              <p className="reader-meta">{copy.wellRead}</p>
            </div>

            <div className="stats-grid">
              <StatCard label="Correct words/min" value={wcpm == null ? "—" : String(wcpm)} />
              <StatCard label="Word accuracy" value={`${Math.round(accuracy * 100)}%`} />
            </div>
          </div>

          {/* Right: progress, practice and the way out. */}
          <div className="stack">
            <div className="progress-note">
              <p className="eyebrow">
                Your progress <TrendingUpIcon className="inline-icon" />
              </p>
              <span className="progress-note__journey">30 → 36 → {wcpm ?? "—"} WCPM</span>
              <span className="note">5 Oct → 12 Oct → Today · Demo practice history</span>
              <div className="nipun">
                <span className="nipun__pill">NIPUN target: 35–54 CWPM</span>
                <span>Classes 2–3</span>
              </div>
            </div>

            {missed.length > 0 && (
              <div className="practice">
                <p className="practice__eyebrow">
                  Practise these words again <RepeatIcon className="inline-icon" />
                </p>
                {missed.map((w, i) => (
                  <div className="practice__row" key={`${w.word}-${i}`}>
                    <span className={`reading-text ${scriptClass(lang)}`} lang={lang}>{w.word}</span>
                    <ListenButton text={w.word ?? ""} lang={lang} label={copy.listen} />
                  </div>
                ))}
              </div>
            )}

            <p className="note">For adults: WCPM means correct words per minute.</p>

            <div className="actions">
              <Button block onClick={finish}>
                Finish reading
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
