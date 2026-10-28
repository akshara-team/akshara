import { useEffect, useState } from "react";
import { api, isMock } from "../../api";
import type { Sentence } from "../../api/types";
import { Button, Card, EmptyState, ListenButton, PageHeader, Select } from "../../components";
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
  const [lang, setLang] = useState<Lang>("kn-IN");
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
      <div className="screen-body reliability">
        <p className="eyebrow">Teacher · Practice sentences</p>
        <h1 className="card__title">Practice sentences from Evon</h1>
        <p className="lead">
          Evon, Gnani’s open language model, writes short sentences for the sounds children find
          hard. Code checks every one: the right script, short, and only sounds taught so far. A
          child sees a sentence only after you approve it.
        </p>

        <div className="filters">
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
            <p className="note" role="status">
              {pending.length} waiting · {approved.length} approved · {stories} sentences from
              stories ready to use
              {done ? ` · ${done}` : ""}
            </p>

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
              <ul className="sentence-list">
                {pending.map((s) => (
                  <li key={s.id}>
                    <Card className="stack sentence-card">
                      <p className={`sentence-text ${scriptClass(lang)}`} lang={lang}>
                        {s.text}
                      </p>
                      <p className="note">
                        Practises{" "}
                        <span className={scriptClass(lang)} lang={lang}>
                          {s.skill ? skillLabel(s.skill) : "—"}
                        </span>{" "}
                        · written by Evon, passed the code checks
                      </p>
                      <div className="actions actions--row">
                        <ListenButton text={s.text} lang={lang} />
                        <Button onClick={() => void decide(s, "approved")}>Approve</Button>
                        <Button variant="ghost" onClick={() => void decide(s, "rejected")}>
                          Reject
                        </Button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}

            {approved.length > 0 && (
              <details className="card">
                <summary className="reader-name">Approved ({approved.length})</summary>
                <ul className="plain-list">
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
