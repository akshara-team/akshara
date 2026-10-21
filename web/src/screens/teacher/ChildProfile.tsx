import { Link, useNavigate, useParams } from "react-router-dom";
import { childById, HISTORY, NIPUN_BAND } from "../../api/teacherData";
import { Avatar, Button, Card, StatCard, Table, PageHeader } from "../../components";
import { scriptEnglish, scriptName } from "../../theme/script";

export function ChildProfile() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const child = childById(childId);
  const latest = HISTORY[HISTORY.length - 1];
  const previous = HISTORY[HISTORY.length - 2];
  const max = Math.max(NIPUN_BAND.max, ...HISTORY.map((h) => h.wcpm));

  return (
    <>
      <PageHeader
        back
        backTo="/teacher"
        badge={child.level}
        nav={[
          { label: "Class", to: "/teacher" },
          { label: "Story", to: "/teacher/story" },
          { label: "Add child", to: "/teacher/add" },
        ]}
      />
      <div className="screen-body">
        <p className="eyebrow">Demo · Static state</p>

        {/* Desktop frame: identity row with the avatar, details and an action. */}
        <div className="metarow">
          <Avatar initials={child.initials} />
          <div className="metarow__text">
            <span className="reader-name">{child.name}</span>
            <span className="reader-meta">
              {child.level} · {scriptName(child.lang)} / {scriptEnglish(child.lang)}
            </span>
          </div>
        </div>

        <div className="workspace workspace--w360">
          {/* Left: progress summary (360 wide in the frame). */}
          <div className="stack">
            <div className="stats-grid">
              <StatCard
                label="WCPM"
                value={String(latest.wcpm)}
                caption={`↑ ${latest.wcpm - previous.wcpm} vs last time`}
              />
              <StatCard
                label="Accuracy"
                value={`${Math.round(latest.accuracy * 100)}%`}
                caption={`↑ ${Math.round((latest.accuracy - previous.accuracy) * 100)} percentage points`}
              />
            </div>

            <Card>
              <p className="eyebrow">
                Aarav’s WCPM · Band: {NIPUN_BAND.min}–{NIPUN_BAND.max}
              </p>
              <div className="chart" role="img" aria-label="WCPM over three attempts">
                {HISTORY.map((h) => (
                  <div className="chart__col" key={h.date}>
                    <span className="chart__value">{h.wcpm}</span>
                    <div
                      className={`chart__bar ${h.wcpm >= NIPUN_BAND.min ? "chart__bar--ok" : ""}`}
                      style={{ height: `${(h.wcpm / max) * 100}%` }}
                    />
                    <span className="chart__label">{h.date}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right: history and next step (808 wide in the frame). */}
          <div className="stack">
            <p className="step__label">Reading history · {HISTORY.length} attempts</p>
            <Table
              columns={[
                { key: "date", header: "Date" },
                { key: "wcpm", header: "WCPM" },
                { key: "accuracy", header: "Accuracy" },
              ]}
              rows={[...HISTORY].reverse().map((h) => ({
                date: h.date,
                wcpm: String(h.wcpm),
                accuracy: `${Math.round(h.accuracy * 100)}%`,
              }))}
            />

            <div className="actions">
              <Button block onClick={() => navigate(`/teacher/attempt/${child.id}`)}>
                View latest attempt
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
      </div>
    </>
  );
}
