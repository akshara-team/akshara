import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CHILDREN, childById } from "../../api/teacherData";
import { Avatar, Button, Card, Input, Radio, Select, PageHeader } from "../../components";

const AVATAR_CHOICES = ["AG", "DK", "RM"];

/**
 * Add / Edit child form (Figma: "Add child · Validation" and "Edit child").
 * Desktop frame: a 340px purpose column beside a 560px form panel.
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
  const [error, setError] = useState<string | null>(
    mode === "add" ? "Add a name before saving." : null,
  );
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
      <PageHeader
        back
        backTo="/teacher"
        nav={[
          { label: "Class", to: "/teacher" },
          { label: "Story", to: "/teacher/story" },
          { label: "Add child", to: "/teacher/add" },
        ]}
      />
      <div className="screen-body">
        <p className="eyebrow">Demo · Static state</p>

        <form
          className="workspace workspace--w340"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {/* Left: form purpose (340 wide in the frame). */}
          <div className="stack">
            <h1 className="card__title">{mode === "add" ? "Add a child" : "Edit child"}</h1>
            <p className="note">
              A familiar name makes it easier to find their reading profile.
            </p>
            <Card>
              <p className="reader-name">Nothing is stored</p>
              <p className="note">
                This is a demo form. It does not save to the API — there are no child
                records yet.
              </p>
            </Card>
          </div>

          {/* Right: form panel (560 wide in the frame). */}
          <div className="stack">
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

            {saved && (
              <p className="note" role="status">
                Saved {name || "child"} locally — this demo does not persist children
                {CHILDREN.length ? ` (${CHILDREN.length} in the demo class)` : ""}.
              </p>
            )}

            <div className="actions">
              <Button block type="submit">
                {mode === "add" ? "Save child" : "Save changes"}
              </Button>
              <Button variant="ghost" block type="button" onClick={() => navigate("/teacher")}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
