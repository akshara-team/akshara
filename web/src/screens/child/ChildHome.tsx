import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { NIPUN_BAND } from "../../api/teacherData";
import {
  Button,
  Card,
  LanguageBadge,
  ProgressBar,
  TopBar,
  WordChip,
  wordStatus,
} from "../../components";
import { useSession } from "../../state/session";
import { useChildProgress } from "../../state/useChildProgress";
import { scriptName } from "../../theme/script";

/**
 * The child's home. One big action, their own progress, and no tables — the
 * teacher dashboard is the detailed view; this is the child's.
 */
export function ChildHome() {
  const navigate = useNavigate();
  const { setReader, setLang, beginPassage } = useSession();
  const { store, synced } = useChildProgress();
  const [busy, setBusy] = useState(false);

  const reader = store.reader;
  const first = reader?.alias.split(" ")[0] ?? "";
  const last = store.readings[0];
  const recent = store.readings.slice(0, 3);
  const bars = [...recent].reverse(); // oldest to newest
  const best = Math.max(0, ...store.readings.map((r) => r.wcpm ?? 0));

  async function start(reuseLast = false) {
    if (!reader) {
      navigate("/switch");
      return;
    }
    setBusy(true);
    try {
      const passages = await api.listPassages(store.lang);
      const repeat =
        reuseLast && last ? passages.find((p) => p.id === last.passageId) : undefined;
      const passage = repeat ?? passages[0];
      if (!passage) return;
      setReader(reader);
      setLang(store.lang);
      beginPassage(passage, api.partsOf(passage));
      navigate(`/read/${passage.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar />
      <div className="home">
        <div className="home__hero">
          <p className="eyebrow">My reading</p>
          <h1 className="card__title">
            {reader ? `Welcome back, ${first}` : "Hello there"}
          </h1>
          <div className="home__meta">
            <LanguageBadge lang={store.lang} />
            <span className="reader-meta">
              {scriptName(store.lang)}
              {reader ? ` · ${reader.level}` : ""}
            </span>
          </div>
        </div>

        {!reader ? (
          <Card>
            <p className="reader-name">Let’s find your name</p>
            <p className="note">Choose who is reading to see your progress.</p>
            <div className="actions">
              <Button block onClick={() => navigate("/switch")}>
                Choose my name
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="home__actions">
              <Button block disabled={busy} onClick={() => start()}>
                {busy ? "Opening…" : "Read a story"}
              </Button>
              {last && (
                <Button variant="outline" block disabled={busy} onClick={() => start(true)}>
                  Read again: {last.storyTitle}
                </Button>
              )}
            </div>

            {recent.length === 0 ? (
              <Card>
                <p className="reader-name">Your first story is waiting</p>
                <p className="note">Tap “Read a story” to begin.</p>
              </Card>
            ) : (
              <>
                <section className="stack">
                  <p className="step__label">My progress</p>
                  {bars.map((r) => (
                    <div className="home__progress" key={r.id}>
                      <span className="reader-meta">{r.storyTitle}</span>
                      <ProgressBar
                        value={r.wcpm ? (r.wcpm / NIPUN_BAND.max) * 100 : 0}
                      />
                      <span className="reader-meta">
                        {r.wcpm ?? "—"} WCPM · {Math.round(r.accuracy * 100)}%
                      </span>
                    </div>
                  ))}
                  {best > 0 && <p className="note">Best so far: {best} WCPM</p>}
                  {synced && (
                    <p className="note">
                      Synced from the class: {synced.attempts} attempts ·{" "}
                      {Math.round(synced.accuracy * 100)}% ·{" "}
                      {synced.wcpm == null ? "—" : Math.round(synced.wcpm)} WCPM
                    </p>
                  )}
                </section>

                <section className="stack">
                  <p className="step__label">My reading</p>
                  {recent.map((r) => (
                    <div className="reading-row" key={r.id}>
                      <div className="reading-row__head">
                        <span className="reader-name">{r.storyTitle}</span>
                        <span className="reader-meta">
                          {new Date(r.at).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                      <div className="reading-row__chips">
                        {r.words
                          .filter((w) => w.op !== "inserted")
                          .slice(0, 6)
                          .map((w, i) => (
                            <WordChip
                              key={`${r.id}-${i}`}
                              status={wordStatus(w)}
                              word={w.word ?? ""}
                              lang={r.language}
                            />
                          ))}
                      </div>
                      <span className="reader-meta">
                        {r.wcpm ?? "—"} WCPM · {Math.round(r.accuracy * 100)}% accurate
                      </span>
                    </div>
                  ))}
                </section>

                <p className="note">
                  Saved on this device. Signing in on another device would show the same
                  reading history once the API stores it.
                </p>
              </>
            )}

            <div className="home__links">
              <button
                type="button"
                className="screen__link"
                onClick={() => navigate("/switch")}
              >
                Not me · switch reader
              </button>
              <button
                type="button"
                className="screen__link"
                onClick={() => navigate("/switch")}
              >
                Change language
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
