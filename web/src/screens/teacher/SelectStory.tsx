import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import type { Passage } from "../../api/types";
import { BookIcon, Button, Card, EmptyState, ListenButton, Select, PageHeader } from "../../components";
import { useSession } from "../../state/session";
import { useLoad } from "../../state/useLoad";
import { scriptClass, type Lang } from "../../theme/script";
import { storyTitle } from "../child/title";
import { TEACHER_NAV } from "./nav";

const NAV = TEACHER_NAV;

const wordCount = (p: Passage) => p.text.split(/\s+/).filter(Boolean).length;

/**
 * The teacher picks a story for a reading session. Without a pick, each child gets the learner
 * model's next story; this is for reading one story together.
 */
export function SelectStory() {
  const navigate = useNavigate();
  const { lang, setLang } = useSession();
  const { data, error } = useLoad(() => api.listPassages(lang), [lang]);
  const [picked, setPicked] = useState<string | null>(null);

  // Easiest first: by the source book's level, then by length.
  const stories = [...(data ?? [])].sort(
    (a, b) => (a.level ?? "9").localeCompare(b.level ?? "9") || wordCount(a) - wordCount(b),
  );
  const story = stories.find((p) => p.id === picked) ?? stories[0] ?? null;

  return (
    <>
      <PageHeader back backTo="/teacher" nav={NAV} />
      <div className="screen-body">
        <p className="eyebrow">Teacher · Story</p>
        <h1 className="card__title">
          Choose a story <BookIcon className="inline-icon" />
        </h1>
        <p className="reader-meta">
          Each child already gets a story at their level. Choose one here to read it together.
        </p>

        <div className="workspace workspace--w300">
          <div className="stack">
            <Select
              label="Reading language"
              value={lang}
              onChange={(v) => {
                setLang(v as Lang);
                setPicked(null);
              }}
              options={[
                { value: "kn-IN", label: "ಕನ್ನಡ · Kannada" },
                { value: "ta-IN", label: "தமிழ் · Tamil" },
                { value: "hi-IN", label: "हिंदी · Hindi" },
              ]}
            />

            {story && (
              <>
                <ListenButton text={story.text} lang={lang} block />
                <Button block onClick={() => navigate(`/reader?story=${encodeURIComponent(story.id)}`)}>
                  Read this story
                </Button>
              </>
            )}
            <Button variant="ghost" block onClick={() => navigate("/reader")}>
              Let each child get their own story
            </Button>
          </div>

          <div className="stack">
            {error ? (
              <EmptyState title="Could not load the stories">
                <p className="note">Check the connection, then open this page again.</p>
              </EmptyState>
            ) : !data ? (
              <p className="note" role="status">
                Loading stories…
              </p>
            ) : stories.length === 0 ? (
              <EmptyState title="No stories in this language yet" />
            ) : (
              <>
                {story && (
                  <Card>
                    <p className={`metarow__title ${scriptClass(lang)}`} lang={lang}>
                      {storyTitle(story)}
                    </p>
                    <p className="reader-meta">
                      {story.level ? `Level ${story.level} · ` : ""}
                      {wordCount(story)} words
                      {story.parts && story.parts.length > 1 ? ` · ${story.parts.length} parts` : ""}
                    </p>
                    <p className={`reading-text ${scriptClass(lang)}`} lang={lang}>
                      {story.text}
                    </p>
                    {story.credit?.publisher && (
                      <p className="note">
                        {story.credit.publisher}
                        {story.credit.licence ? ` · ${story.credit.licence.split(" (")[0]}` : ""}
                      </p>
                    )}
                  </Card>
                )}

                <div className="stack--tight stack" role="radiogroup" aria-label="Stories">
                  {stories.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={p.id === story?.id}
                      className={`reader-row ${p.id === story?.id ? "reader-row--selected" : ""}`}
                      onClick={() => setPicked(p.id)}
                    >
                      <span className="reader-info">
                        <span className={`reader-name ${scriptClass(lang)}`} lang={lang}>
                          {storyTitle(p)}
                        </span>
                        <span className="reader-meta">
                          {p.level ? `Level ${p.level} · ` : ""}
                          {wordCount(p)} words
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
