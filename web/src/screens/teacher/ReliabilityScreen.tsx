import { Link } from "react-router-dom";
import { Card, PageHeader } from "../../components";
import reliability from "../../data/reliability.json";
import { LANGS, scriptEnglish } from "../../theme/script";
import { RETENTION_DAYS } from "./ChildForm";
import { TEACHER_NAV } from "./nav";

/** One count from the study, with its 95% interval (`akshara.reliability.share`). */
type Share = { k: number; n: number; lo: number; hi: number };
type LangReport = {
  passages: number;
  mistakes: Record<Kind, Share>;
  false_flags: Share;
  conditions: Record<Condition, { catch: Share; false_flags: Share }>;
};

// Built by scripts/build_reliability.py from results/; tests/test_reliability.py keeps it fresh.
const DATA = reliability as { sources: string[]; languages: Record<string, LangReport> };

type Kind = "skip" | "distant" | "half" | "near";
const KINDS: { key: Kind; label: string }[] = [
  { key: "skip", label: "A word skipped" },
  { key: "distant", label: "A different word read" },
  { key: "half", label: "Only the first half of a word read" },
  { key: "near", label: "One sound in a word changed" },
];

type Condition = "clear" | "phone" | "noise" | "child";
const CONDITIONS: { key: Condition; label: string }[] = [
  { key: "clear", label: "Clear recording" },
  { key: "phone", label: "Phone-quality sound" },
  { key: "noise", label: "Loud background noise" },
  { key: "child", label: "Higher-pitched voice" },
];

const pct = (s: { k: number; n: number }) => Math.round((100 * s.k) / s.n);
const range = (s: Share) => `${Math.round(s.lo * 100)}–${Math.round(s.hi * 100)}%`;

function pooled(kind: Kind): { k: number; n: number } {
  return LANGS.reduce(
    (t, l) => ({
      k: t.k + DATA.languages[l].mistakes[kind].k,
      n: t.n + DATA.languages[l].mistakes[kind].n,
    }),
    { k: 0, n: 0 },
  );
}

/** A plain verdict from all three languages together. */
function verdict(kind: Kind): string {
  const p = pct(pooled(kind));
  if (p >= 90) return "Almost always caught";
  if (p >= 70) return "Usually caught";
  return "Often missed";
}

function Count({ share }: { share: Share }) {
  return (
    <>
      <span className="figure">
        {share.k} of {share.n}
      </span>
      <span className="figure__range">
        {pct(share)}% · likely {range(share)}
      </span>
    </>
  );
}

const total = LANGS.reduce((n, l) => n + DATA.languages[l].passages, 0);
// How far one word moves a rate, for the smallest and largest groups of one mistake kind.
const sizes = LANGS.flatMap((l) => KINDS.map(({ key }) => DATA.languages[l].mistakes[key].n));
const step = (n: number) => Math.round(100 / n);

/**
 * "How reliable is this?": what the scorer catches and misses, per language, from the saved
 * study results (never typed by hand), with the study's limits and what Akshara keeps.
 */
export function ReliabilityScreen() {
  return (
    <>
      <PageHeader back backTo="/teacher" nav={TEACHER_NAV} />
      <div className="screen-body reliability">
        <h1 className="card__title">How reliable is this?</h1>
        <p className="lead">
          Akshara listens with a speech service and compares what it heard with the story. It
          catches most skipped and wrong words. It often misses a small change in one sound, so
          use the marks to decide who to listen to, not as a grade.
        </p>

        <section className="stack" aria-labelledby="caught-heading">
          <h2 className="section-title" id="caught-heading">
            Mistakes it catches
          </h2>
          <p className="note">
            Out of the mistakes we put into {total} test readings across the three languages.
          </p>
          <div className="table-scroll" role="region" aria-label="Table of mistakes caught" tabIndex={0}>
            <table className="table reliability__table">
              <thead>
                <tr>
                  <th scope="col">Mistake</th>
                  {LANGS.map((l) => (
                    <th scope="col" key={l}>
                      {scriptEnglish(l)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {KINDS.map(({ key, label }) => (
                  <tr key={key}>
                    <th scope="row">
                      {label}
                      <span className={`verdict verdict--${pct(pooled(key)) >= 70 ? "ok" : "weak"}`}>
                        {verdict(key)}
                      </span>
                    </th>
                    {LANGS.map((l) => (
                      <td key={l}>
                        <Count share={DATA.languages[l].mistakes[key]} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th scope="row">
                    Correct words marked wrong
                    <span className="verdict verdict--note">Lower is better</span>
                  </th>
                  {LANGS.map((l) => (
                    <td key={l}>
                      <Count share={DATA.languages[l].false_flags} />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="note">
            “Likely” is the range the true rate probably falls in (95%). With {Math.min(...sizes)}{" "}
            to {Math.max(...sizes)} mistakes of each kind per language, one word moves a rate by{" "}
            {step(Math.max(...sizes))} to {step(Math.min(...sizes))} points.
          </p>
        </section>

        <section className="stack" aria-labelledby="audio-heading">
          <h2 className="section-title" id="audio-heading">
            When the sound is worse
          </h2>
          <p className="note">
            The same readings, made harder on purpose. Each cell shows the share of all mistakes
            caught, then the share of correct words marked wrong.
          </p>
          <div className="table-scroll" role="region" aria-label="Table of results with worse sound" tabIndex={0}>
            <table className="table reliability__table">
              <thead>
                <tr>
                  <th scope="col">Recording</th>
                  {LANGS.map((l) => (
                    <th scope="col" key={l}>
                      {scriptEnglish(l)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CONDITIONS.map(({ key, label }) => (
                  <tr key={key}>
                    <th scope="row">{label}</th>
                    {LANGS.map((l) => {
                      const c = DATA.languages[l].conditions[key];
                      return (
                        <td key={l}>
                          <span className="figure">{pct(c.catch)}% caught</span>
                          <span className="figure__range">{pct(c.false_flags)}% marked wrong</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Card className="stack">
          <h2 className="section-title">What this means for you</h2>
          <ul className="plain-list">
            <li>A red word for a skipped or wrong word is usually right.</li>
            <li>
              A child who changes one sound is often marked correct. If a child seems stuck,
              listen to them read.
            </li>
            <li>
              Words the speech service may have misheard go to{" "}
              <Link to="/teacher/review">Review</Link>, where you can listen and correct the mark.
              Your mark replaces Akshara’s.
            </li>
          </ul>
        </Card>

        <section className="stack" aria-labelledby="limits-heading">
          <h2 className="section-title" id="limits-heading">
            What we have not tested yet
          </h2>
          <ul className="plain-list">
            <li>
              <strong>No children yet.</strong> Every test reading is a computer voice reading a
              StoryWeaver story with mistakes we put in. Real children make other mistakes too,
              such as long pauses and sounding out.
            </li>
            <li>
              <strong>No teacher comparison yet.</strong> Nobody has yet marked the same readings
              by ear to check how often teachers and Akshara agree.
            </li>
            <li>
              <strong>Harder sound is simulated.</strong> The phone, noise and higher-voice tests
              change the recordings with code. They are not real phones, classrooms or children.
            </li>
          </ul>
        </section>

        <section className="stack" aria-labelledby="privacy-heading">
          <h2 className="section-title" id="privacy-heading">
            What Akshara keeps
          </h2>
          <ul className="plain-list">
            <li>A child is added only after a parent or guardian agrees, with the date.</li>
            <li>Only a nickname, the class, the language and the readings. No full names.</li>
            <li>
              Recordings are kept for {RETENTION_DAYS} days so you can listen to them, then
              deleted. The words and scores stay.
            </li>
            <li>
              “Delete this child’s data” on the Edit child page removes the child and everything
              about them at once.
            </li>
          </ul>
        </section>

        <p className="note">
          Source: {DATA.sources.join(", ")} in the Akshara repository, read with the same rules
          the app uses. See docs/RESULTS.md for the full study.
        </p>
      </div>
    </>
  );
}
