import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, isMock, statusOf } from "../../api";
import { initialsOf } from "../../api/classSummary";
import type { Child } from "../../api/types";
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Input,
  PageHeader,
  Radio,
  Select,
} from "../../components";
import { forgetReader } from "../../state/storage";
import { useLoad } from "../../state/useLoad";
import type { Lang } from "../../theme/script";
import { TEACHER_NAV } from "./nav";

const NAV = TEACHER_NAV;

const GRADES = [1, 2, 3, 4, 5];

/** Recordings are deleted after this many days (`AKSHARA_RETENTION_DAYS` on the server). */
export const RETENTION_DAYS = 30;

/** Today on the teacher's device, as YYYY-MM-DD (not UTC: India is ahead of it). */
export function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Add / Edit child (Figma: "Add child · Validation" and "Edit child"). Desktop frame: a 340px
 * purpose column beside a 560px form panel. Saves to `/v1/children` (or the mock class).
 */
export function ChildForm({ mode }: { mode: "add" | "edit" }) {
  const { childId } = useParams<{ childId: string }>();
  const id = Number(childId);
  const { data, error } = useLoad(
    async () => (mode === "edit" ? api.getChild(id) : null),
    [mode, id],
  );

  return (
    <>
      <PageHeader back backTo={mode === "edit" ? `/teacher/child/${id}` : "/teacher"} nav={NAV} />
      <div className="screen-body">
        {mode === "edit" && error ? (
          <p className="note" role="alert">
            Could not load this child.
          </p>
        ) : mode === "edit" && !data ? (
          <p className="note" role="status">
            Loading…
          </p>
        ) : (
          <Form key={data?.id ?? "new"} existing={data} />
        )}
      </div>
    </>
  );
}

function Form({ existing }: { existing: Child | null }) {
  const navigate = useNavigate();
  const [name, setName] = useState(existing?.alias ?? "");
  const [grade, setGrade] = useState<number>(existing?.grade ?? 2);
  const [language, setLanguage] = useState<Lang>(existing?.language ?? "kn-IN");
  // Consent can be re-dated but not taken back here: withdrawing it means deleting the data.
  const consented = Boolean(existing?.consent_date);
  const [consent, setConsent] = useState(consented);
  const [consentDate, setConsentDate] = useState(existing?.consent_date ?? today());
  const [error, setError] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function checkConsent(): string | null {
    if (!consent) {
      return "A parent or guardian must agree before this child’s readings are recorded.";
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(consentDate)) return "Add the date they agreed.";
    if (consentDate > today()) return "The date they agreed cannot be in the future.";
    return null;
  }

  async function save() {
    const alias = name.split(/\s+/).filter(Boolean).join(" ");
    const nameError = !alias
      ? "Add a name before saving."
      : alias.length > 40
        ? "Keep the name under 40 letters."
        : null;
    const consentProblem = checkConsent();
    setError(nameError);
    setConsentError(consentProblem);
    if (nameError || consentProblem) return;
    setFailed(null);
    setBusy(true);
    try {
      const input = {
        alias,
        grade,
        language,
        avatar: initialsOf(alias),
        consent_date: consentDate,
      };
      const child = existing
        ? await api.editChild(existing.id, input)
        : await api.addChild(input);
      navigate(`/teacher/child/${child.id}`);
    } catch (e) {
      if (statusOf(e) === 409) setError("Another child already has this name. Add a letter.");
      else setFailed("Could not save. Check the connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form
      className="workspace workspace--w340"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="stack">
        <h1 className="card__title">{existing ? "Edit child" : "Add a child"}</h1>
        <p className="note">The child picks this name on the reading screen, so use one they know.</p>
        <Card>
          <p className="reader-name">A nickname is enough</p>
          <p className="note">
            Use a first name or nickname, never the full name. Akshara keeps only this name, the
            class, the language and the readings. Recordings are kept for {RETENTION_DAYS} days so
            you can listen to them, then deleted.
            {isMock ? " In this demo, children are saved in this browser only." : ""}
          </p>
        </Card>
      </div>

      <div className="stack">
        <div className="metarow">
          <Avatar initials={name.trim() ? initialsOf(name) : "?"} />
          <span className="reader-meta">Shown with the name</span>
        </div>

        <Input
          label="Child’s name *"
          placeholder="For example, Meena K."
          value={name}
          maxLength={40}
          autoComplete="off"
          error={error ?? undefined}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
        />

        <fieldset className="fieldset">
          <legend className="field__label">Class *</legend>
          <div className="stack--tight stack">
            {GRADES.map((g) => (
              <Radio key={g} selected={grade === g} onSelect={() => setGrade(g)}>
                Class {g}
              </Radio>
            ))}
          </div>
        </fieldset>

        <Select
          label="Reading language *"
          value={language}
          onChange={(v) => setLanguage(v as Lang)}
          options={[
            { value: "kn-IN", label: "ಕನ್ನಡ · Kannada" },
            { value: "ta-IN", label: "தமிழ் · Tamil" },
            { value: "hi-IN", label: "हिंदी · Hindi" },
          ]}
        />

        <fieldset className="fieldset">
          <legend className="field__label">Parent’s consent *</legend>
          <Checkbox
            id="consent"
            checked={consent}
            disabled={consented}
            error={consentError && !consent ? consentError : undefined}
            onChange={(v) => {
              setConsent(v);
              if (consentError) setConsentError(null);
            }}
          >
            A parent or guardian has agreed that Akshara may record this child reading and keep
            their results.
          </Checkbox>
          {consent && (
            <Input
              label="Date they agreed *"
              type="date"
              value={consentDate}
              max={today()}
              error={consentError ?? undefined}
              onChange={(e) => {
                setConsentDate(e.target.value);
                if (consentError) setConsentError(null);
              }}
            />
          )}
          {consented && (
            <p className="note">If a parent takes their consent back, delete this child’s data below.</p>
          )}
        </fieldset>

        {failed && (
          <p className="field__error" role="alert">
            {failed}
          </p>
        )}

        <div className="actions">
          <Button block type="submit" disabled={busy}>
            {busy ? "Saving…" : existing ? "Save changes" : "Save child"}
          </Button>
          <Button
            variant="ghost"
            block
            type="button"
            onClick={() => navigate(existing ? `/teacher/child/${existing.id}` : "/teacher")}
          >
            Cancel
          </Button>
        </div>

        {existing && <DeleteChild child={existing} />}
      </div>
    </form>
  );
}

/** "Delete this child's data": two steps in the page, never a browser dialog. */
function DeleteChild({ child }: { child: Child }) {
  const navigate = useNavigate();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const confirmRow = useRef<HTMLDivElement>(null);

  // Move focus to "Yes, delete" so a keyboard user lands on the question just asked.
  useEffect(() => {
    if (asking) confirmRow.current?.querySelector("button")?.focus();
  }, [asking]);

  function done() {
    forgetReader(child.id);
    navigate("/teacher", { state: { deleted: child.alias } });
  }

  async function remove() {
    setBusy(true);
    setFailed(false);
    try {
      await api.deleteChild(child.id);
      done();
    } catch (e) {
      if (statusOf(e) === 404) return done(); // already gone, e.g. from another tab
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <section className="card danger-zone" aria-labelledby="delete-heading">
      <h2 className="reader-name" id="delete-heading">
        Delete this child’s data
      </h2>
      <p className="note">
        Removes {child.alias}, every reading and recording, your marks and their level. Use it
        when a parent takes their consent back or the child leaves. It cannot be undone.
      </p>
      {!asking ? (
        <Button variant="danger" block onClick={() => setAsking(true)}>
          Delete {child.alias}’s data
        </Button>
      ) : (
        <div className="stack stack--tight">
          <p className="reader-meta">Delete everything about {child.alias}? This cannot be undone.</p>
          <div className="actions" ref={confirmRow}>
            <Button variant="danger" block disabled={busy} onClick={() => void remove()}>
              {busy ? "Deleting…" : "Yes, delete everything"}
            </Button>
            <Button variant="ghost" block disabled={busy} onClick={() => setAsking(false)}>
              Keep {child.alias}’s data
            </Button>
          </div>
        </div>
      )}
      {failed && (
        <p className="field__error" role="alert">
          Could not delete. Check the connection and try again.
        </p>
      )}
    </section>
  );
}
