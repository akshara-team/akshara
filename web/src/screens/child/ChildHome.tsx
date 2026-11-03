import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, childIdOf, storyFor } from "../../api";
import type { Passage } from "../../api/types";
import {
  Action,
  BookIcon,
  BookPage,
  ChildFrame,
  FlameIcon,
  Kolam,
  PersonIcon,
  StarIcon,
  pictureOf,
} from "../../components";
import { coverFor } from "../../data/covers";
import { useQueuedCount } from "../../state/outbox";
import { currentStreak, starCount } from "../../state/rewards";
import { useSession } from "../../state/session";
import { useChildProgress } from "../../state/useChildProgress";
import { useCopy } from "../../i18n";
import { scriptClass } from "../../theme/script";
import { storyTitle } from "./title";

/**
 * The child's home: "this is me, this is my story, tap read". Today's story as a picture book
 * (its real cover), the one Read action, and the child's row of kolams: one for every story
 * finished, and today's still only dots. A star count; no speeds or percentages.
 */
export function ChildHome() {
  const navigate = useNavigate();
  const { setReader, setLang, beginPassage } = useSession();
  const { store, gone } = useChildProgress();
  const [busy, setBusy] = useState(false);
  const lang = store.lang;
  const { t, Tx } = useCopy(lang);
  const waiting = useQueuedCount();
  // Encourage, never compare: a star per story read, and the days in a row (from two).
  const stars = starCount(store.readings);
  const streak = currentStreak(store.readings);

  const reader = gone ? null : store.reader;
  const first = reader?.alias.split(" ")[0] ?? "";
  // One kolam per story finished, newest first.
  const finished = [...new Map(store.readings.map((r) => [r.passageId, r])).values()];

  const [next, setNext] = useState<Passage | null>(null);
  useEffect(() => {
    if (!reader) return;
    let live = true;
    storyFor(lang, childIdOf(reader.id))
      .then((p) => live && setNext(p))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [reader?.id, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    if (!reader) {
      navigate("/switch");
      return;
    }
    setBusy(true);
    try {
      const passage = next ?? (await storyFor(lang, childIdOf(reader.id)));
      if (!passage) return;
      setReader(reader);
      setLang(lang);
      beginPassage(passage, api.partsOf(passage));
      navigate(`/read/${passage.id}`);
    } finally {
      setBusy(false);
    }
  }

  if (!reader) {
    return (
      <ChildFrame
        lang={lang}
        lineKey="home.findNameHelp"
        title="My reading"
        action={
          <Action icon={<PersonIcon />} onClick={() => navigate("/switch")}>
            <Tx k="home.chooseName" />
          </Action>
        }
      >
        <h1 className={`display ${scriptClass(lang)}`} lang={lang}>
          <Tx k="home.findName" />
        </h1>
      </ChildFrame>
    );
  }

  const cover = next ? coverFor(next) : null;
  const todayDone = next ? finished.some((r) => r.passageId === next.id) : false;

  return (
    <ChildFrame
      lang={lang}
      lineKey={finished.length ? "voice.readyStory" : "home.firstStoryHelp"}
      title="My reading"
      mark={pictureOf(reader.id, reader.picture)}
      action={
        <Action icon={<BookIcon />} disabled={busy} onClick={() => void start()}>
          <Tx k={busy ? "home.opening" : "home.readStory"} />
        </Action>
      }
    >
      <h1 className={`display ${scriptClass(lang)}`} lang={lang}>
        <Tx k="home.welcomeBack" vars={{ name: first }} />
      </h1>
      {waiting > 0 && (
        <p className="note" role="status">
          <Tx k="home.waiting" vars={{ n: waiting }} />
        </p>
      )}

      <BookPage
        className="today"
        art={cover}
        artFrom={next ? storyTitle(next) : null}
        lang={lang}
        fallback={next ? <Kolam seed={next.id} progress={0} /> : null}
      >
        <p className={`today__title ${scriptClass(lang)}`} lang={lang}>
          {next ? storyTitle(next) : <Tx k="home.firstStory" />}
        </p>
      </BookPage>

      <section className="kolams" aria-label={t("home.myStories")}>
        <ul className="kolams__row">
          {finished.slice(0, 5).map((r) => (
            <li key={r.passageId} title={r.storyTitle}>
              <Kolam seed={r.passageId} tone="leaf" label={r.storyTitle} />
            </li>
          ))}
          {next && !todayDone && (
            <li className="kolams__next">
              <Kolam seed={next.id} progress={0} />
            </li>
          )}
        </ul>
        <p className="kolams__stars" aria-label={`${t("rewards.stars")}: ${stars}`}>
          <StarIcon width={28} height={28} aria-hidden="true" />
          <span className="num">{stars}</span>
        </p>
        {streak > 1 && (
          <p className="kolams__streak" aria-label={`${t("rewards.streak")}: ${streak}`}>
            <FlameIcon width={24} height={24} aria-hidden="true" />
            <span className="num">{streak}</span>
          </p>
        )}
      </section>
    </ChildFrame>
  );
}
