import { Link, useNavigate, useParams } from "react-router-dom";
import { api, isMock } from "../../api";
import { initialsOf, levelOf } from "../../api/classSummary";
import { NIPUN_BAND } from "../../api/teacherData";
import { Avatar, Button, Card, EmptyState, StatCard, Table, PageHeader } from "../../components";
import { useLoad } from "../../state/useLoad";
import { scriptEnglish, scriptName } from "../../theme/script";

const NAV = [
  { label: "Class", to: "/teacher" },
  { label: "Story", to: "/teacher/story" },
  { label: "Add child", to: "/teacher/add" },
];

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
    async () => Promise.all([api.getChild(id), api.childReadings(id)]),
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

  const [child, readings] = data;
  const first = child.alias.split(" ")[0];
  const latest = readings[0];
  const previous = readings[1];
  // Oldest first for the chart, at most the last six readings.
  const chart = readings.slice(0, 6).reverse();
  const max = Math.max(NIPUN_BAND.max, ...chart.map((r) => r.wcpm ?? 0));

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

              <Card>
                <p className="eyebrow">
                  {first}’s WCPM · Target band: {NIPUN_BAND.min}–{NIPUN_BAND.max}
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
                        className={`chart__bar ${(r.wcpm ?? 0) >= NIPUN_BAND.min ? "chart__bar--ok" : ""}`}
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
