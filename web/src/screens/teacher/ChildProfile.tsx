import { Link, useNavigate, useParams } from "react-router-dom";
import { api, isMock } from "../../api";
import { levelOf } from "../../api/classSummary";
import { fslGoal } from "../../lib/nipun";
import { BenchmarkBand, Button, ChildMark, EmptyState, PageHeader, pictureOf } from "../../components";
import { LEVEL_TEXT } from "./PlacementScreen";
import { useLoad } from "../../state/useLoad";
import { isLang, scriptClass, scriptEnglish, scriptName } from "../../theme/script";
import { TEACHER_NAV } from "./nav";

const NAV = TEACHER_NAV;

/** "19 Oct" from unix seconds. */
export function shortDate(at: number): string {
  return new Date(at * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

function change(now: number | null, before: number | null, unit: string): string | undefined {
  if (now == null || before == null) return undefined;
  const d = Math.round(now - before);
  if (d === 0) return "the same as last time";
  return `${d > 0 ? "up" : "down"} ${Math.abs(d)}${unit} on last time`;
}

/**
 * One child, as a page of the class register: who they are and the step they are on in one
 * sentence, the sounds they are working on as chalk tiles, their words a minute over time,
 * and every reading as a ruled row.
 */
export function ChildProfile() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const id = Number(childId);
  const { data, error } = useLoad(
    async () =>
      Promise.all([
        api.getChild(id),
        api.childReadings(id),
        api.childSkills(id).catch(() => ({ working_on: [], learned: [] })),
      ]),
    [id],
  );

  if (error) {
    return (
      <>
        <PageHeader back backTo="/teacher" nav={NAV} />
        <div className="register-page">
          <EmptyState title="Child not found">
            <p className="note">They may have been removed. Go back to the class.</p>
            <Link className="screen__link" to="/teacher">
              Back to class
            </Link>
          </EmptyState>
        </div>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <PageHeader back backTo="/teacher" nav={NAV} />
        <div className="register-page">
          <p className="note" role="status">
            Loading…
          </p>
        </div>
      </>
    );
  }

  const [child, readings, skills] = data;
  const level = child.level ? LEVEL_TEXT[child.level] : null;
  const first = child.alias.split(" ")[0];
  const latest = readings[0];
  const previous = readings[1];
  // Oldest first for the chart, at most the last six readings.
  const chart = readings.slice(0, 6).reverse();
  const goal = fslGoal(child.language);
  const max = Math.max(goal?.high ?? 0, ...chart.map((r) => r.wcpm ?? 0));
  const readingPath = (session: string) =>
    `/teacher/child/${child.id}/reading/${encodeURIComponent(session)}`;
  const trend = latest ? change(latest.wcpm, previous?.wcpm ?? null, "") : undefined;

  return (
    <>
      <PageHeader back backTo="/teacher" badge={levelOf(child.grade)} nav={NAV} />
      <div className="register-page">
        <div className="register-head">
          <div className="register-head__who">
            <ChildMark picture={pictureOf(child.id, child.avatar)} />
            <h1 className="register-head__title">{child.alias}</h1>
          </div>
          {latest && (
            <Button icon="book" onClick={() => navigate(readingPath(latest.session))}>
              View latest reading
            </Button>
          )}
        </div>

        {/* One status sentence: who, which step, how the last reading went. */}
        <p className="register-status">
          {levelOf(child.grade)}, reads{" "}
          <span className={scriptClass(child.language)} lang={child.language}>
            {scriptName(child.language)}
          </span>{" "}
          ({scriptEnglish(child.language)}).{" "}
          {level ? (
            <>
              Reading step <strong>{level.name}</strong>: {level.means}.
            </>
          ) : (
            <strong>Not placed yet.</strong>
          )}
          {child.level_uncertain && <strong> Listen again to confirm the step.</strong>}
          {latest && (
            <>
              {" "}
              Latest reading: <span className="num">
                {latest.wcpm == null ? "-" : Math.round(latest.wcpm)}
              </span>{" "}
              words a minute, <span className="num">{pct(latest.accuracy)}</span> right
              {trend ? ` (${trend})` : ""}.
            </>
          )}
          {isMock && <span className="register-status__goal">Demo data.</span>}
        </p>

        <div className="register-links">
          <button
            type="button"
            className="link-button"
            onClick={() => navigate(`/teacher/child/${child.id}/placement`)}
          >
            {level ? "Check the level again" : "Find reading level"}
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => navigate(`/teacher/edit/${child.id}`)}
          >
            Edit child
          </button>
        </div>

        {(skills.working_on.length > 0 || skills.learned.length > 0) && (
          <section className="sounds" aria-label="Sounds">
            {skills.working_on.length > 0 && (
              <div className="sounds__row">
                <h2 className="sounds__label">Working on</h2>
                <ul className="sounds__tiles">
                  {skills.working_on.map((s) => (
                    <li
                      key={s.text}
                      className={`sound sound--now ${scriptClass(child.language)}`}
                      lang={child.language}
                    >
                      {s.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {skills.learned.length > 0 && (
              <div className="sounds__row">
                <h2 className="sounds__label">Learned</h2>
                <ul className="sounds__tiles">
                  {skills.learned.slice(0, 12).map((s) => (
                    <li
                      key={s.text}
                      className={`sound ${scriptClass(child.language)}`}
                      lang={child.language}
                    >
                      {s.text}
                    </li>
                  ))}
                  {skills.learned.length > 12 && (
                    <li className="sound sound--more">and {skills.learned.length - 12} more</li>
                  )}
                </ul>
              </div>
            )}
          </section>
        )}

        {!latest ? (
          <EmptyState title={`${first} has not read yet`}>
            <p className="note">
              Their readings will appear here. On the child screen, choose {child.alias} and read a
              story.
            </p>
          </EmptyState>
        ) : (
          <>
            {latest.wcpm != null && (
              <BenchmarkBand lang={child.language} grade={3} wcpm={latest.wcpm} />
            )}

            {chart.length > 1 && (
              <figure className="progress-page">
                <figcaption className="sounds__label">{first}’s words a minute</figcaption>
                <div
                  className="chart"
                  role="img"
                  aria-label={`WCPM over the last ${chart.length} readings: ${chart
                    .map((r) => (r.wcpm == null ? "no time" : Math.round(r.wcpm)))
                    .join(", ")}`}
                >
                  {chart.map((r) => (
                    <div className="chart__col" key={r.session}>
                      <span className="chart__value">
                        {r.wcpm == null ? "-" : Math.round(r.wcpm)}
                      </span>
                      <div
                        className={`chart__bar ${goal && (r.wcpm ?? 0) >= goal.low ? "chart__bar--ok" : ""}`}
                        style={{ height: `${((r.wcpm ?? 0) / max) * 100}%` }}
                      />
                      <span className="chart__label">{shortDate(r.at)}</span>
                    </div>
                  ))}
                </div>
              </figure>
            )}

            <h2 className="register-section">
              Reading history · {readings.length} {readings.length === 1 ? "reading" : "readings"}
            </h2>
            <div className="register">
              <table className="register__table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Story</th>
                    <th scope="col" className="num">
                      WCPM
                    </th>
                    <th scope="col" className="num">
                      Accuracy
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r) => (
                    <tr key={r.session} className="register__row">
                      <td>
                        <Link className="register__open" to={readingPath(r.session)}>
                          {shortDate(r.at)}
                        </Link>
                      </td>
                      <td>
                        <span className={isLang(r.language) ? scriptClass(r.language) : undefined} lang={r.language}>
                          {r.title ?? r.passage_id}
                        </span>
                      </td>
                      <td className="num">{r.wcpm == null ? "-" : Math.round(r.wcpm)}</td>
                      <td className="num">{pct(r.accuracy)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
