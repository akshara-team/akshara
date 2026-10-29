import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, childIdOf, storyFor } from "../../api";
import { toReader } from "../../api/classSummary";
import type { Reader } from "../../api/types";
import { Avatar, Button, Card, CheckIcon, EmptyState, PageHeader, SayButton } from "../../components";
import { useSession } from "../../state/session";
import { setReaderAndLang } from "../../state/storage";
import { useLoad } from "../../state/useLoad";
import { useCopy, type CopyKey } from "../../i18n";
import { scriptClass, scriptName } from "../../theme/script";

/** The children the teacher added for this language; the child taps their own name. */
export function ChooseReader() {
  const { lang, setReader, beginPassage } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: children, error: loadError } = useLoad(() => api.listChildren(lang), [lang]);
  const readers: Reader[] = (children ?? []).map(toReader);
  const [picked, setPicked] = useState<string | null>(null);
  const selected = readers.find((r) => r.id === picked) ?? readers[0] ?? null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CopyKey | null>(null);
  const { Tx } = useCopy(lang);
  const language = scriptName(lang);

  async function start() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setReader(selected);
    setReaderAndLang(selected, lang);
    try {
      // A story the teacher chose (`?story=`), else the learner model's pick.
      const passage = await storyFor(lang, childIdOf(selected.id), params.get("story"));
      if (!passage) {
        setError("reader.noStories");
        setBusy(false);
        return;
      }
      beginPassage(passage, api.partsOf(passage));
      navigate(`/read/${passage.id}`);
    } catch {
      setError("reader.loadFailedHelp");
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader back backTo="/switch" />
      <div className="hero">
        <div className="say-row">
          <h1 className="hero__title">
            <Tx k="reader.title" />
          </h1>
          <SayButton k="say.choose" lang={lang} />
        </div>
        <p className="hero__sub">
          <Tx k="reader.sub" />
        </p>
      </div>

      <div className="screen-body">
        <div className="workspace workspace--w360">
          {/* Left: context. */}
          <div className="stack">
            <Card>
              <p className="eyebrow">
                <Tx k="reader.welcome" />
              </p>
              <p className="reader-name">
                <Tx k="reader.readingIn" vars={{ language }} />
              </p>
              <p className="reader-meta">
                <Tx k="reader.pick" />
              </p>
            </Card>

            <Button variant="ghost" block icon="language" onClick={() => navigate("/")}>
              <Tx k="reader.otherLanguage" />
            </Button>
          </div>

          {/* Right: readers and continue. */}
          <div className="stack">
            {loadError ? (
              <EmptyState title={<Tx k="reader.loadFailed" />}>
                <p className="note">
                  <Tx k="reader.loadFailedHelp" />
                </p>
              </EmptyState>
            ) : children === null ? (
              <p className="note" role="status">
                <Tx k="reader.loading" />
              </p>
            ) : readers.length === 0 ? (
              <EmptyState title={<Tx k="reader.none" />}>
                <p className="note">
                  <Tx k="reader.noneHelp" vars={{ language }} />
                </p>
                <Button variant="outline" icon="add" onClick={() => navigate("/teacher/add")}>
                  <Tx k="reader.addChild" />
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
                <Tx k={error} />
              </p>
            )}

            <div className="actions">
              {selected && (
                <Button block icon="next" disabled={busy} onClick={start}>
                  {busy ? (
                    <Tx k="reader.opening" />
                  ) : (
                    <Tx k="reader.continueAs" vars={{ name: selected.alias }} />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
