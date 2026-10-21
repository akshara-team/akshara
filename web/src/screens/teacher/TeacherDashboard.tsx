import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CHILDREN, CLASSROOM, CLASS_METRICS } from "../../api/teacherData";
import { Avatar, Card, Select, StatusBadge, TopBar } from "../../components";
import { scriptName, type Lang } from "../../theme/script";

export function TeacherDashboard() {
  const navigate = useNavigate();
  const [className, setClassName] = useState("class-3");
  const [language, setLanguage] = useState("kn-IN");

  return (
    <>
      <TopBar back backTo="/" />
      <div className="screen-body">
        <p className="eyebrow">{CLASSROOM.eyebrow}</p>
        <h1 className="card__title">Your reading class</h1>

        <Card>
          <p className="reader-name">
            {CLASSROOM.className} · {scriptName(language as Lang)}
          </p>
          <p className="reader-meta">{CLASSROOM.children} children · latest attempts</p>
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
          {CLASS_METRICS.map((m) => (
            <div className="metric" key={m.label}>
              <span className="metric__value">{m.value}</span>
              <span className="metric__label">{m.label}</span>
              <span className="metric__delta">{m.delta}</span>
            </div>
          ))}
        </div>

        <p className="step__label">
          {CLASSROOM.children} children · latest attempts
        </p>

        <div className="stack--tight stack">
          {CHILDREN.map((c) => (
            <button
              key={c.id}
              type="button"
              className="reader-row"
              onClick={() => navigate(`/teacher/child/${c.id}`)}
            >
              <Avatar initials={c.initials} />
              <span className="reader-info">
                <span className="reader-name">{c.name}</span>
                <span className="reader-meta">
                  {c.wcpm} WCPM · {Math.round(c.accuracy * 100)}% accuracy
                </span>
              </span>
              <StatusBadge tone={c.status === "in-target" ? "success" : "warning"}>
                {c.status === "in-target" ? "In target band" : "Practise together"}
              </StatusBadge>
            </button>
          ))}
        </div>

        <div className="actions">
          <button type="button" className="btn btn--outline btn--block" onClick={() => navigate("/teacher/story")}>
            Choose a story
          </button>
          <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate("/teacher/add")}>
            Add a child
          </button>
        </div>
      </div>
    </>
  );
}
