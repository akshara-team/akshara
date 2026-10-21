import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, isMock } from "../../api";
import { toRoster } from "../../api/classSummary";
import { CHILDREN, CLASSROOM, CLASS_METRICS, DEMO_SUMMARY } from "../../api/teacherData";
import { Avatar, Card, Select, StatusBadge, PageHeader } from "../../components";
import { useIsDesktop } from "../../state/useMediaQuery";
import { scriptName, type Lang } from "../../theme/script";

export function TeacherDashboard() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [className, setClassName] = useState("class-3");
  const [language, setLanguage] = useState("kn-IN");

  // Demo class shown until the API answers (and if it never does).
  const demo = useMemo(() => toRoster(DEMO_SUMMARY, CHILDREN), []);
  const [data, setData] = useState(demo);
  const [usingDemo, setUsingDemo] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .classSummary()
      .then((rows) => {
        if (!alive) return;
        const next = toRoster(rows, CHILDREN);
        if (next.roster.length === 0) return; // keep the demo class
        setData(next);
        setUsingDemo(isMock);
      })
      .catch(() => {
        /* offline or the endpoint is missing: keep the demo class */
      });
    return () => {
      alive = false;
    };
  }, []);

  const metrics = [
    { value: data.metrics.avgWcpm == null ? "—" : String(data.metrics.avgWcpm), label: "Avg WCPM" },
    { value: `${Math.round(data.metrics.accuracy * 100)}%`, label: "Accuracy" },
    { value: `${data.metrics.needHelp} / ${data.metrics.total}`, label: "Need help" },
  ];

  const openChild = (id: string) => navigate(`/teacher/child/${id}`);

  return (
    <>
      <PageHeader
        back
        backTo="/"
        badge={CLASSROOM.className}
        nav={[
          { label: "Class", to: "/teacher" },
          { label: "Story", to: "/teacher/story" },
          { label: "Add child", to: "/teacher/add" },
        ]}
      />
      <div className="screen-body">
        <p className="eyebrow">{CLASSROOM.eyebrow}</p>
        <h1 className="card__title">Your reading class</h1>

        <Card>
          <p className="reader-name">
            {CLASSROOM.className} · {scriptName(language as Lang)}
          </p>
          <p className="reader-meta">
            {data.metrics.total} children · latest attempts ·{" "}
            {usingDemo ? "demo data" : "live from the API"}
          </p>
        </Card>

        <div className="filters">
          <Select
            label="Class"
            value={className}
            onChange={setClassName}
            options={[
              { value: "class-2", label: "Class 2" },
              { value: "class-3", label: "Class 3" },
            ]}
          />
          <Select
            label="Language"
            value={language}
            onChange={setLanguage}
            options={[
              { value: "kn-IN", label: "ಕನ್ನಡ · Kannada" },
              { value: "ta-IN", label: "தமிழ் · Tamil" },
              { value: "hi-IN", label: "हिंदी · Hindi" },
            ]}
          />
        </div>

        <div className="metrics">
          {metrics.map((m, i) => (
            <div className="metric" key={m.label}>
              <span className="metric__value">{m.value}</span>
              <span className="metric__label">{m.label}</span>
              {usingDemo && <span className="metric__delta">{CLASS_METRICS[i]?.delta}</span>}
            </div>
          ))}
        </div>

        <p className="step__label">{data.metrics.total} children · latest attempts</p>

        {isDesktop ? (
          /* Desktop frame: a five-column roster table. */
          <table className="roster-table">
            <thead>
              <tr>
                <th scope="col">Child</th>
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
                  <td>{c.wcpm ?? "—"}</td>
                  <td>{Math.round(c.accuracy * 100)}%</td>
                  <td className="reader-meta">—</td>
                  <td>
                    <StatusBadge tone={c.status === "in-target" ? "success" : "warning"}>
                      {c.status === "in-target" ? "In target band" : "Practise together"}
                    </StatusBadge>
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
                    {c.wcpm ?? "—"} WCPM · {Math.round(c.accuracy * 100)}% accuracy
                  </span>
                </span>
                <StatusBadge tone={c.status === "in-target" ? "success" : "warning"}>
                  {c.status === "in-target" ? "In target band" : "Practise together"}
                </StatusBadge>
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
