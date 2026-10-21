import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import type { Reader } from "../../api/types";
import { Avatar, Button, Card, CheckIcon, TopBar } from "../../components";
import { useSession } from "../../state/session";
import { scriptClass, scriptName } from "../../theme/script";

/** Mock readers — the API only knows a single `learner` alias. */
const READERS: Reader[] = [
  { id: "aarav", alias: "Aarav Gowda", initials: "AG", level: "Class 3", lang: "kn-IN" },
  { id: "diya", alias: "Diya K.", initials: "DK", level: "Class 2", lang: "kn-IN" },
];

export function ChooseReader() {
  const { lang, setReader, beginPassage } = useSession();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Reader>(READERS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    setReader(selected);
    try {
      const passages = await api.listPassages(lang);
      const passage = passages[0];
      if (!passage) throw new Error("No passages for this language yet.");
      beginPassage(passage, api.partsOf(passage));
      navigate(`/read/${passage.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load a story.");
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar back backTo="/" />
      <div className="hero">
        <h1 className="hero__title">Who is reading?</h1>
        <p className="hero__sub">Choose your name to begin.</p>
      </div>

      <div className="screen-body">
        <div className="workspace workspace--w360">
          {/* Left: context. */}
          <div className="stack">
            <Card>
              <p className="eyebrow">Welcome · Demo school</p>
              <p className={`reader-name ${scriptClass(lang)}`}>
                Reading in {scriptName(lang)}
              </p>
              <p className="reader-meta">Pick the name the child recognises.</p>
            </Card>

            <Button variant="ghost" block onClick={() => navigate("/")}>
              Choose another language
            </Button>
          </div>

          {/* Right: readers and continue. */}
          <div className="stack">
            <div className="stack" role="radiogroup" aria-label="Reader">
              {READERS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={r.id === selected.id}
                  className={`reader-row ${r.id === selected.id ? "reader-row--selected" : ""}`}
                  onClick={() => setSelected(r)}
                >
                  <Avatar initials={r.initials} selected={r.id === selected.id} />
                  <span className="reader-info">
                    <span className="reader-name">{r.alias}</span>
                    <span className={`reader-meta ${scriptClass(lang)}`}>
                      {r.level} · {scriptName(lang)}
                    </span>
                  </span>
                  {r.id === selected.id && (
                    <span className="reader-check" aria-hidden="true">
                      <CheckIcon width={20} height={20} />
                    </span>
                  )}
                </button>
              ))}
            </div>

            {error && (
              <p className="field__error" role="alert">
                {error}
              </p>
            )}

            <div className="actions">
              <Button block disabled={busy} onClick={start}>
                {busy ? "Loading…" : `Continue as ${selected.alias}`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
