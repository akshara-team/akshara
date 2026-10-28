import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, childIdOf, storyFor } from "../../api";
import { NIPUN_BAND } from "../../api/teacherData";
import {
  Button,
  Card,
  LanguageBadge,
  ProgressBar,
  PageHeader,
  WordChip,
  wordStatus,
} from "../../components";
import { useQueuedCount } from "../../state/outbox";
import { useSession } from "../../state/session";
import { useChildProgress } from "../../state/useChildProgress";
import { useCopy } from "../../i18n";
import { scriptClass, scriptName } from "../../theme/script";

/**
 * The child's home. One big action, their own progress, and no tables — the
 * teacher dashboard is the detailed view; this is the child's.
 */
export function ChildHome() {
  const navigate = useNavigate();
  const { setReader, setLang, beginPassage } = useSession();
  const { store, synced, gone } = useChildProgress();
  const [busy, setBusy] = useState(false);
  const { t, Tx } = useCopy(store.lang);
  const waiting = useQueuedCount();

  const reader = gone ? null : store.reader;
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
      const passage = await storyFor(
        store.lang,
        childIdOf(reader.id),
        reuseLast && last ? last.passageId : null,
      );
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
      <PageHeader />
      <div className="home">
        <div className="home__hero">
          <p className="eyebrow">
            <Tx k="home.eyebrow" />
          </p>
          <h1 className="card__title">
            {reader ? <Tx k="home.welcomeBack" vars={{ name: first }} /> : <Tx k="home.hello" />}
          </h1>
          <div className="home__meta">
            <LanguageBadge lang={store.lang} />
            <span className="reader-meta">
              <span className={scriptClass(store.lang)} lang={store.lang}>
                {scriptName(store.lang)}
              </span>
              {reader ? ` · ${reader.level}` : ""}
            </span>
          </div>
          {waiting > 0 && (
            <p className="note" role="status">
              <Tx k="home.waiting" vars={{ n: waiting }} />
            </p>
          )}
        </div>

        {!reader ? (
          <Card>
            <p className="reader-name">
              <Tx k="home.findName" />
            </p>
            <p className="note">
              <Tx k="home.findNameHelp" />
            </p>
            <div className="actions">
              <Button block onClick={() => navigate("/switch")}>
                <Tx k="home.chooseName" />
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="home__actions">
              <Button block disabled={busy} onClick={() => start()}>
                <Tx k={busy ? "home.opening" : "home.readStory"} />
              </Button>
              {last && (
                <Button variant="outline" block disabled={busy} onClick={() => start(true)}>
                  <Tx k="home.readAgain" vars={{ title: last.storyTitle }} />
                </Button>
              )}
            </div>

            {recent.length === 0 ? (
              <Card>
                <p className="reader-name">
                  <Tx k="home.firstStory" />
                </p>
                <p className="note">
                  <Tx k="home.firstStoryHelp" />
                </p>
              </Card>
            ) : (
              <>
                <section className="stack">
                  <p className="step__label">
                    <Tx k="home.progress" />
                  </p>
                  {bars.map((r) => (
                    <div className="home__progress" key={r.id}>
                      <span className={`reader-meta ${scriptClass(r.language)}`} lang={r.language}>
                        {r.storyTitle}
                      </span>
                      <ProgressBar
                        value={r.wcpm ? (r.wcpm / NIPUN_BAND.max) * 100 : 0}
                        label={t("home.target", { title: r.storyTitle })}
                      />
                      <span className="reader-meta">
                        <Tx
                          k="home.speed"
                          vars={{ wcpm: r.wcpm ?? "—", accuracy: Math.round(r.accuracy * 100) }}
                        />
                      </span>
                    </div>
                  ))}
                  {best > 0 && (
                    <p className="note">
                      <Tx k="home.best" vars={{ wcpm: best }} />
                    </p>
                  )}
                  {synced?.latest && (
                    <p className="note">
                      <Tx k="home.teacherSees" vars={{ count: synced.readings }} />
                    </p>
                  )}
                </section>

                <section className="stack">
                  <p className="step__label">
                    <Tx k="home.myReading" />
                  </p>
                  {recent.map((r) => (
                    <div className="reading-row" key={r.id}>
                      <div className="reading-row__head">
                        <span className={`reader-name ${scriptClass(r.language)}`} lang={r.language}>
                          {r.storyTitle}
                        </span>
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
                            <WordChip uiLang={store.lang}
                              key={`${r.id}-${i}`}
                              status={wordStatus(w)}
                              word={w.word ?? ""}
                              lang={r.language}
                            />
                          ))}
                      </div>
                      <span className="reader-meta">
                        <Tx
                          k="home.speed"
                          vars={{ wcpm: r.wcpm ?? "—", accuracy: Math.round(r.accuracy * 100) }}
                        />
                      </span>
                    </div>
                  ))}
                </section>
              </>
            )}

            <div className="home__links">
              <button type="button" className="screen__link" onClick={() => navigate("/switch")}>
                <Tx k="home.notMe" />
              </button>
              <button type="button" className="screen__link" onClick={() => navigate("/switch")}>
                <Tx k="home.changeLanguage" />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
