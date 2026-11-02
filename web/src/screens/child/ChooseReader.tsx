import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, childIdOf, storyFor } from "../../api";
import { toReader } from "../../api/classSummary";
import type { Reader } from "../../api/types";
import { Button, ChildFrame, EmptyState } from "../../components";
import { useSession } from "../../state/session";
import { setReaderAndLang } from "../../state/storage";
import { useLoad } from "../../state/useLoad";
import { useCopy, type CopyKey } from "../../i18n";
import { scriptClass, scriptName } from "../../theme/script";
import { ReaderGrid } from "./ReaderGrid";

/** A story the teacher chose (`?story=`), or the next one: the child taps their own picture. */
export function ChooseReader() {
  const { lang, setReader, beginPassage } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: children, error: loadError } = useLoad(() => api.listChildren(lang), [lang]);
  const readers: Reader[] = (children ?? []).map(toReader);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<CopyKey | null>(null);
  const { Tx } = useCopy(lang);

  async function start(chosen: Reader) {
    setBusyId(chosen.id);
    setError(null);
    setReader(chosen);
    setReaderAndLang(chosen, lang);
    try {
      // A story the teacher chose (`?story=`), else the learner model's pick.
      const passage = await storyFor(lang, childIdOf(chosen.id), params.get("story"));
      if (!passage) {
        setError("reader.noStories");
        setBusyId(null);
        return;
      }
      beginPassage(passage, api.partsOf(passage));
      navigate(`/read/${passage.id}`);
    } catch {
      setError("reader.loadFailedHelp");
      setBusyId(null);
    }
  }

  return (
    <ChildFrame lang={lang} lineKey="voice.tapYou" title="Choose a reader">
      <div className="who">
        <h1 className={`display ${scriptClass(lang)}`} lang={lang}>
          <Tx k="reader.title" />
        </h1>
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
              <Tx k="reader.noneHelp" vars={{ language: scriptName(lang) }} />
            </p>
            <Button variant="outline" icon="add" onClick={() => navigate("/teacher/add")}>
              <Tx k="reader.addChild" />
            </Button>
          </EmptyState>
        ) : (
          <ReaderGrid readers={readers} lang={lang} busyId={busyId} onPick={(r) => void start(r)} />
        )}
        {error && (
          <p className="field__error" role="alert">
            <Tx k={error} />
          </p>
        )}
      </div>
    </ChildFrame>
  );
}
