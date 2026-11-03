import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, isMock } from "../../api";
import { toRoster, type RosterEntry } from "../../api/classSummary";
import type { Child, Level } from "../../api/types";
import {
  Button,
  CheckIcon,
  ChildMark,
  EmptyState,
  PageHeader,
  Select,
  pictureOf,
} from "../../components";
import { fslGoal } from "../../lib/nipun";
import { load as loadChild } from "../../state/storage";
import { scriptEnglish, scriptName, type Lang } from "../../theme/script";
import { TEACHER_NAV } from "./nav";

const STATUS_TEXT = {
  "in-target": "On target",
  practise: "Practise together",
  new: "No reading yet",
} as const;

/** ASER's reading steps, top to bottom: the register's groups (Teaching at the Right Level). */
const STEPS: { key: Level | "none"; name: string }[] = [
  { key: "story", name: "Story" },
  { key: "paragraph", name: "Paragraph" },
  { key: "word", name: "Word" },
  { key: "letter", name: "Letter" },
  { key: "beginner", name: "Beginning" },
  { key: "none", name: "Not placed yet" },
];

/** The four steps a child climbs, as ticks in the register. */
const CLIMB: Level[] = ["letter", "word", "paragraph", "story"];

function stepOf(c: RosterEntry): Level | "none" {
  return c.readingLevel ?? "none";
}

/**
 * The class register: ruled rows on rice paper with a red margin, grouped by the reading step
 * each child is on, so the teacher can teach each group at its level. One status sentence,
 * one call to action. Calm and factual: the data never moves.
 */
export function TeacherDashboard() {
  const navigate = useNavigate();
  const deleted = (useLocation().state as { deleted?: string } | null)?.deleted;
  const [grade, setGrade] = useState("all");
  const [language, setLanguage] = useState<Lang>(() => loadChild().lang);
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

  const [toApprove, setToApprove] = useState(0);
  useEffect(() => {
    let alive = true;
    api
      .listSentences(language, { source: "evon", status: "pending" })
      .then((r) => alive && setToApprove(r.length))
      .catch(() => alive && setToApprove(0));
    return () => {
      alive = false;
    };
  }, [language]);

  const data = useMemo(
    () =>
      toRoster((children ?? []).filter((c) => grade === "all" || String(c.grade) === grade)),
    [children, grade],
  );
  const groups = STEPS.map((s) => ({
    ...s,
    rows: data.roster.filter((c) => stepOf(c) === s.key),
  })).filter((g) => g.rows.length > 0);

  const m = data.metrics;
  const goal = fslGoal(language);
  const gradeLabel = grade === "all" ? "All classes" : `Class ${grade}`;
  const openChild = (id: number) => navigate(`/teacher/child/${id}`);

  return (
    <>
      <PageHeader back backTo="/" badge={gradeLabel} nav={TEACHER_NAV} />
      <div className="register-page">
        <div className="register-head">
          <h1 className="register-head__title">Your reading class</h1>
          {toHear != null && toHear > 0 && (
            <Button
              icon="audio"
              className="register-head__cta"
              onClick={() => navigate("/teacher/review")}
            >
              Listen and check
            </Button>
          )}
        </div>

        <div className="register-filters">
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

        {deleted && (
          <p className="banner" role="status">
            {deleted} and all their readings, recordings and marks are deleted.
          </p>
        )}

        {/* One status sentence: the class in figures, and what is waiting for the teacher. */}
        <p className="register-status">
          <span className="num">{m.total}</span> {m.total === 1 ? "child" : "children"} reading{" "}
          {scriptEnglish(language)}
          {m.avgWcpm != null && (
            <>
              {" "}· average <span className="num">{m.avgWcpm}</span> words a minute,{" "}
              <span className="num">{Math.round((m.accuracy ?? 0) * 100)}%</span> right
            </>
          )}
          {" "}· <span className="num">{m.needHelp} of {m.total}</span> to practise with
          {toHear != null && toHear > 0 && (
            <>
              {" "}· <strong>{toHear} {toHear === 1 ? "mark" : "marks"} to check by ear</strong>
            </>
          )}
          {goal && (
            <span className="register-status__goal">
              Goal (FLS 2022, Grade 3): {goal.low}-{goal.high} words a minute.{" "}
              {isMock ? "Demo data." : null}
            </span>
          )}
        </p>

        {toApprove > 0 && (
          <p className="register-note">
            {toApprove} {toApprove === 1 ? "practice sentence" : "practice sentences"} from Evon
            to approve; a child sees a sentence only after you approve it.{" "}
            <button type="button" className="link-button" onClick={() => navigate("/teacher/sentences")}>
              Read and approve
            </button>
          </p>
        )}

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
        ) : (
          <div className="register">
            <table className="register__table">
              <thead>
                <tr>
                  <th scope="col">Child</th>
                  <th scope="col" className="register__steps-col">
                    Steps
                  </th>
                  <th scope="col" className="num">
                    Latest WCPM
                  </th>
                  <th scope="col" className="num register__wide">
                    Accuracy
                  </th>
                  <th scope="col" className="num register__wide">
                    Previous
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Fragment key={g.key}>
                    <tr className="register__group">
                      <th scope="rowgroup" colSpan={6}>
                        {g.name} <span className="num">· {g.rows.length}</span>
                      </th>
                    </tr>
                    {g.rows.map((c) => (
                      <RegisterRow key={c.id} c={c} onOpen={() => openChild(c.id)} />
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="register-foot">
          <Button variant="outline" onClick={() => navigate("/teacher/story")}>
            Choose a story
          </Button>
          <Button variant="ghost" onClick={() => navigate("/teacher/add")}>
            Add a child
          </Button>
        </div>
      </div>
    </>
  );
}

/** One child on the register: picture, nickname, steps climbed, last reading, status. */
function RegisterRow({ c, onOpen }: { c: RosterEntry; onOpen: () => void }) {
  const reached = c.readingLevel ? CLIMB.indexOf(c.readingLevel as Level) : -1;
  return (
    <tr className="register__row" data-status={c.status}>
      <td>
        <button type="button" className="register__child" onClick={onOpen}>
          <ChildMark picture={pictureOf(c.id, c.picture)} />
          <span>
            <span className="register__name">{c.name}</span>
            <span className="register__meta">
              {c.level}
              {c.levelUncertain ? " · level to confirm" : ""}
            </span>
          </span>
        </button>
      </td>
      <td className="register__steps-col">
        <span className="register__steps" aria-label={`${reached + 1} of 4 steps`}>
          {CLIMB.map((s, i) => (
            <i key={s} data-on={i <= reached} title={s}>
              {i <= reached && <CheckIcon width={14} height={14} />}
            </i>
          ))}
        </span>
      </td>
      <td className="num">{c.wcpm ?? "-"}</td>
      <td className="num register__wide">
        {c.accuracy == null ? "-" : `${Math.round(c.accuracy * 100)}%`}
      </td>
      <td className="num register__wide">{c.previousWcpm ?? "-"}</td>
      <td>
        <span className="register__status">{STATUS_TEXT[c.status]}</span>
      </td>
    </tr>
  );
}
