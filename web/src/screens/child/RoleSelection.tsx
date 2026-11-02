import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { toReader } from "../../api/classSummary";
import type { Reader } from "../../api/types";
import { Button, ChildFrame, EmptyState, FIRST_AKSHARA, Logo, UsersIcon } from "../../components";
import { useCopy } from "../../i18n";
import { useSession } from "../../state/session";
import { setLanguage as persistLanguage, setReaderAndLang } from "../../state/storage";
import { useLoad } from "../../state/useLoad";
import { LANGS, scriptClass, scriptName } from "../../theme/script";
import { ReaderGrid } from "./ReaderGrid";

/**
 * The shared phone or tablet, as the teacher hands it over: the class's language as three
 * script letters, then every child as their picture in chalk. The child taps their own and
 * their home opens. No English on the child's path; the teacher's door is a small link.
 */
export function RoleSelection() {
  const { lang, setLang, setReader } = useSession();
  const navigate = useNavigate();
  const { Tx } = useCopy(lang);
  const { data: children, error } = useLoad(() => api.listChildren(lang), [lang]);
  const readers: Reader[] = (children ?? []).map(toReader);
  const [busy, setBusy] = useState<string | null>(null);

  function pick(r: Reader) {
    setBusy(r.id);
    setReader(r);
    setReaderAndLang(r, lang);
    navigate("/home");
  }

  return (
    <ChildFrame
      lang={lang}
      lineKey="voice.tapYou"
      title="Welcome"
      action={
        <Link className="teacher-door" to="/teacher">
          <UsersIcon width={20} height={20} aria-hidden="true" />
          <span>I am the teacher</span>
        </Link>
      }
    >
      <div className="who">
        <div className="who__top">
          <Logo lang={lang} />
          <div className="lang-pick" role="radiogroup" aria-label="Reading language">
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={l === lang}
                aria-label={scriptName(l)}
                className={`lang-pick__letter ${scriptClass(l)}`}
                lang={l}
                onClick={() => {
                  setLang(l);
                  persistLanguage(l);
                }}
              >
                {FIRST_AKSHARA[l]}
              </button>
            ))}
          </div>
        </div>

        <h1 className={`display ${scriptClass(lang)}`} lang={lang}>
          <Tx k="reader.title" />
        </h1>

        {error ? (
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
              <Tx k="reader.noneHelp" vars={{ language: scriptName(lang) }} />
            </p>
            <Button variant="outline" icon="add" onClick={() => navigate("/teacher/add")}>
              <Tx k="reader.addChild" />
            </Button>
          </EmptyState>
        ) : (
          <ReaderGrid readers={readers} lang={lang} busyId={busy} onPick={pick} />
        )}
      </div>
    </ChildFrame>
  );
}
