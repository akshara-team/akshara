import { Link, useNavigate, useParams } from "react-router-dom";
import { api, isMock } from "../../api";
import { initialsOf, levelOf } from "../../api/classSummary";
import { fslGoal } from "../../lib/nipun";
import {
  Avatar,
  BenchmarkBand,
  Button,
  Card,
  EmptyState,
  StatCard,
  StatusBadge,
  Table,
  PageHeader,
} from "../../components";
import { LEVEL_TEXT } from "./PlacementScreen";
import { useLoad } from "../../state/useLoad";
import { scriptClass, scriptEnglish, scriptName } from "../../theme/script";
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
  return `${d > 0 ? "↑" : d < 0 ? "↓" : "→"} ${Math.abs(d)}${unit} vs last time`;
}

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
        <div className="screen-body">
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
        <div className="screen-body">
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

  return (
    <>
      <PageHeader back backTo="/teacher" badge={levelOf(child.grade)} nav={NAV} />
      <div className="screen-body">
        <p className="eyebrow">Teacher · Child profile{isMock ? " · demo data" : ""}</p>

        <div className="metarow">
          <Avatar initials={child.avatar || initialsOf(child.alias)} />
          <div className="metarow__text">
            <span className="reader-name">{child.alias}</span>
            <span className="reader-meta">
              {levelOf(child.grade)} · {scriptName(child.language)} /{" "}
              {scriptEnglish(child.language)}
            </span>
          </div>
        </div>

        <Card>
          <div className="metarow">
            <div className="metarow__text">
              <span className="eyebrow">Reading level (ASER)</span>
              <span className="reader-name">
                {level ? `${level.name} · ${level.means}` : "Not placed yet"}{" "}
                {child.level_uncertain && <StatusBadge tone="warning">Listen again</StatusBadge>}
              </span>
            </div>
          </div>
          {(skills.working_on.length > 0 || skills.learned.length > 0) && (
            <div className="stack--tight stack">
              {skills.working_on.length > 0 && (
                <p className="note">
                  Working on:{" "}
                  <span className={scriptClass(child.language)} lang={child.language}>
                    {skills.working_on.map((s) => s.text).join("  ")}
                  </span>
                </p>
              )}
              {skills.learned.length > 0 && (
                <p className="note">
                  Learned:{" "}
                  <span className={scriptClass(child.language)} lang={child.language}>
                    {skills.learned
                      .slice(0, 12)
                      .map((s) => s.text)
                      .join("  ")}
                  </span>
                  {skills.learned.length > 12 ? ` and ${skills.learned.length - 12} more` : ""}
                </p>
              )}
            </div>
          )}
          <div className="actions">
            <Button
              variant={level ? "ghost" : "primary"}
              onClick={() => navigate(`/teacher/child/${child.id}/placement`)}
            >
              {level ? "Check the level again" : "Find reading level"}
            </Button>
          </div>
        </Card>

        {!latest ? (
          <EmptyState title={`${first} has not read yet`}>
            <p className="note">
              Their readings will appear here. On the child screen, choose {child.alias} and read a
              story.
            </p>
            <div className="actions">
              <Button variant="ghost" onClick={() => navigate(`/teacher/edit/${child.id}`)}>
                Edit child
              </Button>
            </div>
          </EmptyState>
        ) : (
          <div className="workspace workspace--w360">
            <div className="stack">
              <div className="stats-grid">
                <StatCard
                  label="WCPM"
                  value={latest.wcpm == null ? "—" : String(Math.round(latest.wcpm))}
                  caption={change(latest.wcpm, previous?.wcpm ?? null, "")}
                />
                <StatCard
                  label="Accuracy"
                  value={pct(latest.accuracy)}
                  caption={change(
                    latest.accuracy * 100,
                    previous ? previous.accuracy * 100 : null,
                    " points",
                  )}
                />
              </div>

              {latest.wcpm != null && (
                <BenchmarkBand lang={child.language} grade={3} wcpm={latest.wcpm} />
              )}

              <Card>
                <p className="eyebrow">
                  {first}’s WCPM
                  {goal ? ` · End-of-Grade-3 goal: ${goal.low}–${goal.high}` : ""}
                </p>
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
                        {r.wcpm == null ? "—" : Math.round(r.wcpm)}
                      </span>
                      <div
                        className={`chart__bar ${goal && (r.wcpm ?? 0) >= goal.low ? "chart__bar--ok" : ""}`}
                        style={{ height: `${((r.wcpm ?? 0) / max) * 100}%` }}
                      />
                      <span className="chart__label">{shortDate(r.at)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="stack">
              <p className="step__label">
                Reading history · {readings.length} {readings.length === 1 ? "reading" : "readings"}
              </p>
              <Table
                columns={[
                  { key: "date", header: "Date" },
                  { key: "story", header: "Story" },
                  { key: "wcpm", header: "WCPM" },
                  { key: "accuracy", header: "Accuracy" },
                  { key: "open", header: "Details" },
                ]}
                rows={readings.map((r) => ({
                  date: shortDate(r.at),
                  story: r.title ?? r.passage_id,
                  wcpm: r.wcpm == null ? "—" : String(Math.round(r.wcpm)),
                  accuracy: pct(r.accuracy),
                  open: (
                    <Link
                      className="screen__link"
                      to={`/teacher/child/${child.id}/reading/${encodeURIComponent(r.session)}`}
                    >
                      Open
                    </Link>
                  ),
                }))}
              />

              <div className="actions">
                <Button
                  block
                  onClick={() =>
                    navigate(
                      `/teacher/child/${child.id}/reading/${encodeURIComponent(latest.session)}`,
                    )
                  }
                >
                  View latest reading
                </Button>
                <Button variant="ghost" block onClick={() => navigate(`/teacher/edit/${child.id}`)}>
                  Edit child
                </Button>
                <Link className="screen__link" to="/teacher">
                  Back to class
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
