import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, isMock, statusOf } from "../../api";
import { initialsOf } from "../../api/classSummary";
import type { Child } from "../../api/types";
import { Avatar, Button, Card, Input, Radio, Select, PageHeader } from "../../components";
import { useLoad } from "../../state/useLoad";
import type { Lang } from "../../theme/script";

const NAV = [
  { label: "Class", to: "/teacher" },
  { label: "Story", to: "/teacher/story" },
  { label: "Add child", to: "/teacher/add" },
];

const GRADES = [1, 2, 3, 4, 5];

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
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const alias = name.split(/\s+/).filter(Boolean).join(" ");
    if (!alias) {
      setError("Add a name before saving.");
      return;
    }
    if (alias.length > 40) {
      setError("Keep the name under 40 letters.");
      return;
    }
    setError(null);
    setFailed(null);
    setBusy(true);
    try {
      const input = { alias, grade, language, avatar: initialsOf(alias) };
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
            class, the language and the readings.
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
      </div>
    </form>
  );
}
