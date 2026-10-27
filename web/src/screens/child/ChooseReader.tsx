import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { toReader } from "../../api/classSummary";
import type { Reader } from "../../api/types";
import { Avatar, Button, Card, CheckIcon, EmptyState, PageHeader } from "../../components";
import { useSession } from "../../state/session";
import { setReaderAndLang } from "../../state/storage";
import { useLoad } from "../../state/useLoad";
import { scriptClass, scriptName } from "../../theme/script";

/** The children the teacher added for this language; the child taps their own name. */
export function ChooseReader() {
  const { lang, setReader, beginPassage } = useSession();
  const navigate = useNavigate();
  const { data: children, error: loadError } = useLoad(() => api.listChildren(lang), [lang]);
  const readers: Reader[] = (children ?? []).map(toReader);
  const [picked, setPicked] = useState<string | null>(null);
  const selected = readers.find((r) => r.id === picked) ?? readers[0] ?? null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setReader(selected);
    setReaderAndLang(selected, lang);
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
      <PageHeader back backTo="/switch" />
      <div className="hero">
        <h1 className="hero__title">Who is reading?</h1>
        <p className="hero__sub">Choose your name to begin.</p>
      </div>

      <div className="screen-body">
        <div className="workspace workspace--w360">
          {/* Left: context. */}
          <div className="stack">
            <Card>
              <p className="eyebrow">Welcome</p>
              <p className={`reader-name ${scriptClass(lang)}`} lang={lang}>
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
            {loadError ? (
              <EmptyState title="Could not load the names">
                <p className="note">Check the connection, then try again.</p>
              </EmptyState>
            ) : children === null ? (
              <p className="note" role="status">
                Loading names…
              </p>
            ) : readers.length === 0 ? (
              <EmptyState title="No names yet">
                <p className="note">
                  Ask your teacher to add you for {scriptName(lang)} reading.
                </p>
                <Button variant="outline" onClick={() => navigate("/teacher/add")}>
                  I am the teacher: add a child
                </Button>
              </EmptyState>
            ) : (
            <div className="stack" role="radiogroup" aria-label="Reader">
              {readers.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={r.id === selected?.id}
                  className={`reader-row ${r.id === selected?.id ? "reader-row--selected" : ""}`}
                  onClick={() => setPicked(r.id)}
                >
                  <Avatar initials={r.initials} selected={r.id === selected?.id} />
                  <span className="reader-info">
                    <span className="reader-name">{r.alias}</span>
                    <span className={`reader-meta ${scriptClass(lang)}`} lang={lang}>
                      {r.level} · {scriptName(lang)}
                    </span>
                  </span>
                  {r.id === selected?.id && (
                    <span className="reader-check" aria-hidden="true">
                      <CheckIcon width={20} height={20} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            )}

            {error && (
              <p className="field__error" role="alert">
                {error}
              </p>
            )}

            <div className="actions">
              {selected && (
                <Button block disabled={busy} onClick={start}>
                  {busy ? "Loading…" : `Continue as ${selected.alias}`}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
