import { useNavigate } from "react-router-dom";
import { Button, RepeatIcon, SparklesIcon, StatCard, TopBar, TrendingUpIcon } from "../../components";
import { useSession } from "../../state/session";
import { scriptClass } from "../../theme/script";
import { flowCopy } from "./copy";

export function ResultsScreen() {
  const { lang, parts, reset } = useSession();
  const navigate = useNavigate();
  const copy = flowCopy(lang);

  const read = parts.filter((p) => p.attempt);
  const words = read.flatMap((p) => p.attempt?.words ?? []);
  const totalWords = words.length;
  const correct = words.filter((w) => w.op === "correct").length;
  const seconds = read.reduce((sum, p) => sum + (p.seconds ?? 0), 0);
  const accuracy = totalWords ? correct / totalWords : 0;
  const wcpm = seconds > 0 ? Math.round((correct / seconds) * 60) : null;
  const missed = words.filter((w) => w.op === "substituted" || w.op === "skipped");

  function finish() {
    reset();
    navigate("/");
  }

  return (
    <>
      <TopBar back={false} />
      <div className="screen-body">
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
                <span className={`reading-text ${scriptClass(lang)}`}>{w.word}</span>
                <Button variant="outline" icon="audio" onClick={() => undefined}>
                  {copy.listen}
                </Button>
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
    </>
  );
}
