import { useEffect, useState } from "react";
import { api, isMock } from "../../api";
import type { Sentence } from "../../api/types";
import { Button, EmptyState, ListenButton, PageHeader, Select } from "../../components";
import { load as loadChild } from "../../state/storage";
import { scriptClass, type Lang } from "../../theme/script";
import { TEACHER_NAV } from "./nav";

/** A skill id as a teacher reads it: `sign:ಾ` → ◌ಾ, `letter:ದ` → ದ. */
export function skillLabel(id: string): string {
  const [kind, text = ""] = id.split(":");
  return kind === "sign" || kind === "mark" ? `◌${text}` : text;
}

/**
 * Practice sentences from Evon, waiting for a teacher. Evon writes short sentences for the
 * sounds children find hard, code checks every one (`content/sentences.py`), and a child sees
 * one only after a teacher approves it here.
 */
export function SentencesScreen() {
  // The class's language: the one this device last read in.
  const [lang, setLang] = useState<Lang>(() => loadChild().lang);
  const [rows, setRows] = useState<Sentence[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setFailed(false);
    api
      .listSentences(lang)
      .then((r) => alive && setRows(r))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [lang]);

  async function decide(s: Sentence, status: "approved" | "rejected") {
    try {
      const out = await api.reviewSentence(s.id, status);
      setRows((prev) => prev?.map((r) => (r.id === s.id ? out : r)) ?? prev);
      setDone(status === "approved" ? "Approved. Children can read it now." : "Rejected. No child will see it.");
    } catch {
      setDone("Could not save. Check the connection and try again.");
    }
  }

  const evon = rows?.filter((r) => r.source === "evon") ?? [];
  const pending = evon.filter((r) => r.status === "pending");
  const approved = evon.filter((r) => r.status === "approved");
  const stories = rows?.filter((r) => r.source === "story").length ?? 0;

  return (
    <>
      <PageHeader back backTo="/teacher" nav={TEACHER_NAV} />
      <div className="register-page">
        <div className="register-head">
          <h1 className="register-head__title">Practice sentences from Evon</h1>
        </div>

        <div className="register-filters">
          <Select
            label="Language"
            value={lang}
            onChange={(v) => setLang(v as Lang)}
            options={[
              { value: "kn-IN", label: "ಕನ್ನಡ · Kannada" },
              { value: "ta-IN", label: "தமிழ் · Tamil" },
              { value: "hi-IN", label: "हिंदी · Hindi" },
            ]}
          />
        </div>

        <p className="register-status">
          Evon, Gnani’s open language model, writes short sentences for the sounds children find
          hard. Code checks every one: the right script, short, and only sounds taught so far. A
          child sees a sentence only after you approve it.
          {rows && (
            <span className="register-status__goal" role="status">
              {pending.length} waiting, {approved.length} approved, {stories} sentences from
              stories ready to use{done ? `, ${done}` : ""}.
            </span>
          )}
        </p>

        {failed ? (
          <p className="note" role="alert">
            Could not load the sentences.
          </p>
        ) : !rows ? (
          <p className="note" role="status">
            Loading…
          </p>
        ) : (
          <>
            {pending.length === 0 ? (
              <EmptyState title="Nothing waiting for you">
                <p className="note">
                  {evon.length === 0
                    ? "Evon’s sentences appear here once its batch has run (scripts/evon_sentences.py, see docs/EVON_HOWTO.md). Until then, children practise with sentences from the stories."
                    : "Every sentence from Evon has been checked. New ones appear here after the next batch."}
                  {isMock ? " In this demo, your choices are saved in this browser only." : ""}
                </p>
              </EmptyState>
            ) : (
              <div className="register">
                <table className="register__table">
                  <tbody>
                    {pending.map((s) => (
                      <tr key={s.id} className="register__row">
                        <td>
                          <p className={`sentence-line ${scriptClass(lang)}`} lang={lang}>
                            {s.text}
                          </p>
                          <span className="register__meta">
                            Practises{" "}
                            <span className={scriptClass(lang)} lang={lang}>
                              {s.skill ? skillLabel(s.skill) : "-"}
                            </span>
                            , written by Evon, passed the code checks
                          </span>
                          <div className="register-actions">
                            <ListenButton text={s.text} lang={lang} />
                            <Button onClick={() => void decide(s, "approved")}>Approve</Button>
                            <Button variant="ghost" onClick={() => void decide(s, "rejected")}>
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {approved.length > 0 && (
              <details className="register-more">
                <summary>Approved ({approved.length})</summary>
                <ul className="register-list">
                  {approved.map((s) => (
                    <li key={s.id} className={scriptClass(lang)} lang={lang}>
                      {s.text}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>
    </>
  );
}
