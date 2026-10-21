import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CHILDREN, childById } from "../../api/teacherData";
import { Avatar, Button, Input, Radio, Select, TopBar } from "../../components";

const AVATAR_CHOICES = ["AG", "DK", "RM"];

/**
 * Add / Edit child form (Figma: "Add child · Validation" and "Edit child").
 * Demo-only: nothing is persisted — the API has no children.
 */
export function ChildForm({ mode }: { mode: "add" | "edit" }) {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const existing = mode === "edit" ? childById(childId) : null;

  const [name, setName] = useState(existing?.name ?? "");
  const [className, setClassName] = useState(existing?.level ?? "Class 3");
  const [language, setLanguage] = useState(existing?.lang ?? "kn-IN");
  const [avatar, setAvatar] = useState(existing?.initials ?? AVATAR_CHOICES[0]);
  const [error, setError] = useState<string | null>(mode === "add" ? "Add a name before saving." : null);
  const [saved, setSaved] = useState(false);

  function save() {
    if (!name.trim()) {
      setError("Add a name before saving.");
      return;
    }
    setError(null);
    setSaved(true);
  }

  return (
    <>
      <TopBar back backTo="/teacher" />
      <div className="screen-body">
        <p className="eyebrow">Demo · Static state</p>
        <h1 className="card__title">{mode === "add" ? "Add a child" : "Edit child"}</h1>
        <p className="note">
          A familiar name makes it easier to find their reading profile.
        </p>

        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Input
            label="Child’s name *"
            placeholder="Enter child’s name"
            value={name}
            error={error ?? undefined}
            onChange={(e) => setName(e.target.value)}
          />

          <fieldset className="fieldset">
            <legend className="field__label">Class *</legend>
            <div className="stack--tight stack">
              {["Class 2", "Class 3"].map((c) => (
                <Radio key={c} selected={className === c} onSelect={() => setClassName(c)}>
                  {c}
                </Radio>
              ))}
            </div>
          </fieldset>

          <Select
            label="Reading language *"
            value={language}
            onChange={(v) => setLanguage(v as typeof language)}
            options={[
              { value: "kn-IN", label: "ಕನ್ನಡ · Kannada" },
              { value: "ta-IN", label: "தமிழ் · Tamil" },
              { value: "hi-IN", label: "हिंदी · Hindi" },
            ]}
          />

          <div className="field">
            <span className="field__label">Choose an avatar</span>
            <div className="avatar-picker">
              {AVATAR_CHOICES.map((initials) => (
                <button
                  key={initials}
                  type="button"
                  className="avatar-pick"
                  aria-pressed={avatar === initials}
                  onClick={() => setAvatar(initials)}
                >
                  <Avatar initials={initials} selected={avatar === initials} />
                </button>
              ))}
            </div>
          </div>

          <div className="actions">
            <Button block type="submit">
              {mode === "add" ? "Save child" : "Save changes"}
            </Button>
            <Button variant="ghost" block type="button" onClick={() => navigate("/teacher")}>
              Cancel
            </Button>
          </div>
        </form>

        {saved && (
          <p className="note" role="status">
            Saved {name || "child"} locally — this demo does not persist children
            {CHILDREN.length ? ` (${CHILDREN.length} in the demo class)` : ""}.
          </p>
        )}
      </div>
    </>
  );
}
