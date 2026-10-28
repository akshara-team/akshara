import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, isMock } from "../../api";
import { toRoster } from "../../api/classSummary";
import { TEACHER_NAV } from "./nav";
import { LEVEL_TEXT } from "./PlacementScreen";
import type { Child } from "../../api/types";
import { Avatar, Button, Card, EmptyState, Select, StatusBadge, PageHeader } from "../../components";
import { useIsDesktop } from "../../state/useMediaQuery";
import { scriptName, type Lang } from "../../theme/script";

const STATUS_TEXT = {
  "in-target": "On target",
  practise: "Practise together",
  new: "No reading yet",
} as const;

const STATUS_TONE = { "in-target": "success", practise: "warning", new: "neutral" } as const;

export function TeacherDashboard() {
  const navigate = useNavigate();
  const deleted = (useLocation().state as { deleted?: string } | null)?.deleted;
  const isDesktop = useIsDesktop();
  const [grade, setGrade] = useState("all");
  const [language, setLanguage] = useState<Lang>("kn-IN");
  const [children, setChildren] = useState<Child[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setChildren(null);
    setFailed(false);
    api
      .listChildren(language)
      .then((rows) => alive && setChildren(rows))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [language]);

  const [toHear, setToHear] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    setToHear(null);
    api
      .reviewQueue(language)
      .then((q) => alive && setToHear(q.length))
      .catch(() => alive && setToHear(null));
    return () => {
      alive = false;
    };
  }, [language]);

  const data = useMemo(
    () =>
      toRoster(
        (children ?? []).filter((c) => grade === "all" || String(c.grade) === grade),
      ),
    [children, grade],
  );

  const metrics = [
    { value: data.metrics.avgWcpm == null ? "—" : String(data.metrics.avgWcpm), label: "Avg WCPM" },
    {
      value: data.metrics.accuracy == null ? "—" : `${Math.round(data.metrics.accuracy * 100)}%`,
      label: "Accuracy",
    },
    { value: `${data.metrics.needHelp} / ${data.metrics.total}`, label: "Need help" },
  ];
  const source = isMock ? "demo data" : "live";
  const gradeLabel = grade === "all" ? "All classes" : `Class ${grade}`;

  const openChild = (id: number) => navigate(`/teacher/child/${id}`);

  return (
    <>
      <PageHeader
        back
        backTo="/"
        badge={gradeLabel}
        nav={TEACHER_NAV}
      />
      <div className="screen-body">
        <p className="eyebrow">
          Teacher · {data.metrics.total} {data.metrics.total === 1 ? "child" : "children"} · {source}
        </p>
        <h1 className="card__title">Your reading class</h1>

        {deleted && (
          <p className="banner" role="status">
            {deleted} and all their readings, recordings and marks are deleted.
          </p>
        )}

        <Card>
          <p className="reader-name">
            {gradeLabel} · {scriptName(language)}
          </p>
          <p className="reader-meta">
            {data.metrics.total} {data.metrics.total === 1 ? "child" : "children"} · latest
            readings · {source}
          </p>
        </Card>

        <div className="filters">
          <Select
            label="Class"
            value={grade}
            onChange={setGrade}
            options={[
              { value: "all", label: "All classes" },
              ...[1, 2, 3, 4, 5].map((g) => ({ value: String(g), label: `Class ${g}` })),
            ]}
          />
          <Select
            label="Language"
            value={language}
            onChange={(v) => setLanguage(v as Lang)}
            options={[
              { value: "kn-IN", label: "ಕನ್ನಡ · Kannada" },
              { value: "ta-IN", label: "தமிழ் · Tamil" },
              { value: "hi-IN", label: "हिंदी · Hindi" },
            ]}
          />
        </div>

        <div className="metrics">
          {metrics.map((m) => (
            <div className="metric" key={m.label}>
              <span className="metric__value">{m.value}</span>
              <span className="metric__label">{m.label}</span>
            </div>
          ))}
        </div>

        {toHear != null && toHear > 0 && (
          <Card>
            <p className="reader-name">
              {toHear} {toHear === 1 ? "mark" : "marks"} to check by ear
            </p>
            <p className="note">
              Words the speech service may have misheard. Listening takes a few seconds each.
            </p>
            <div className="actions">
              <Button variant="outline" onClick={() => navigate("/teacher/review")}>
                Listen and check
              </Button>
            </div>
          </Card>
        )}

        <p className="step__label">
          {data.metrics.total} {data.metrics.total === 1 ? "child" : "children"} · latest readings
        </p>

        {failed ? (
          <EmptyState title="Could not load the class">
            <p className="note">Check the connection, then open this page again.</p>
          </EmptyState>
        ) : children === null ? (
          <p className="note" role="status">
            Loading the class…
          </p>
        ) : data.roster.length === 0 ? (
          <EmptyState title="No children yet">
            <p className="note">Add a child who reads in {scriptName(language)} to start.</p>
            <Button onClick={() => navigate("/teacher/add")}>Add a child</Button>
          </EmptyState>
        ) : isDesktop ? (
          /* Desktop frame: a five-column roster table. */
          <table className="roster-table">
            <thead>
              <tr>
                <th scope="col">Child</th>
                <th scope="col">Level</th>
                <th scope="col">Latest WCPM</th>
                <th scope="col">Accuracy</th>
                <th scope="col">Previous</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.roster.map((c) => (
                <tr key={c.id} onClick={() => openChild(c.id)}>
                  <td>
                    <span className="roster-table__child">
                      <Avatar initials={c.initials} />
                      <span>
                        <span className="roster-table__name">{c.name}</span>
                        <br />
                        <span className="reader-meta">{c.level}</span>
                      </span>
                    </span>
                  </td>
                  <td>
                    {c.readingLevel ? LEVEL_TEXT[c.readingLevel].name : "—"}
                    {c.levelUncertain ? " ?" : ""}
                  </td>
                  <td>{c.wcpm ?? "—"}</td>
                  <td>{c.accuracy == null ? "—" : `${Math.round(c.accuracy * 100)}%`}</td>
                  <td className="reader-meta">{c.previousWcpm ?? "—"}</td>
                  <td>
                    <StatusBadge tone={STATUS_TONE[c.status]}>{STATUS_TEXT[c.status]}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* Mobile frame: the same rows as cards. */
          <div className="stack--tight stack">
            {data.roster.map((c) => (
              <button
                key={c.id}
                type="button"
                className="reader-row"
                onClick={() => openChild(c.id)}
              >
                <Avatar initials={c.initials} />
                <span className="reader-info">
                  <span className="reader-name">{c.name}</span>
                  <span className="reader-meta">
                    {c.readingLevel ? `${LEVEL_TEXT[c.readingLevel].name} level · ` : ""}
                    {c.status === "new"
                      ? `${c.level} · no reading yet`
                      : `${c.wcpm ?? "—"} WCPM · ${Math.round((c.accuracy ?? 0) * 100)}% accuracy`}
                  </span>
                </span>
                <StatusBadge tone={STATUS_TONE[c.status]}>{STATUS_TEXT[c.status]}</StatusBadge>
              </button>
            ))}
          </div>
        )}

        <div className="actions">
          <button
            type="button"
            className="btn btn--outline btn--block"
            onClick={() => navigate("/teacher/story")}
          >
            Choose a story
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() => navigate("/teacher/add")}
          >
            Add a child
          </button>
        </div>
      </div>
    </>
  );
}
