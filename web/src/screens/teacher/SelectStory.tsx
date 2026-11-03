import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import type { Passage } from "../../api/types";
import { BookPage, Button, EmptyState, Kolam, ListenButton, PageHeader, Select } from "../../components";
import { coverFor } from "../../data/covers";
import { useSession } from "../../state/session";
import { useLoad } from "../../state/useLoad";
import { scriptClass, scriptEnglish, type Lang } from "../../theme/script";
import { storyTitle } from "../child/title";
import { TEACHER_NAV } from "./nav";

const NAV = TEACHER_NAV;

const wordCount = (p: Passage) => p.text.split(/\s+/).filter(Boolean).length;

/**
 * The teacher picks a story to read together. Without a pick, each child gets the learner
 * model's next story. A register page: the language, one sentence, the chosen story as a book
 * page, and every story as a ruled row, easiest first.
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
  const cover = story ? coverFor(story) : null;

  return (
    <>
      <PageHeader back backTo="/teacher" nav={NAV} />
      <div className="register-page">
        <div className="register-head">
          <h1 className="register-head__title">Choose a story</h1>
          {story && (
            <Button
              icon="book"
              onClick={() => navigate(`/reader?story=${encodeURIComponent(story.id)}`)}
            >
              Read this story
            </Button>
          )}
        </div>

        <div className="register-filters">
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
        </div>

        <p className="register-status">
          Each child already gets a story at their level. Choose one here to read it together
          {data ? `: ${stories.length} ${scriptEnglish(lang)} ${stories.length === 1 ? "story" : "stories"}, easiest first` : ""}
          .{" "}
          <button type="button" className="link-button" onClick={() => navigate("/reader")}>
            Let each child choose
          </button>
        </p>

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
          <div className="story-pick">
            {story && (
              <BookPage
                className="book-page--teacher story-pick__page"
                art={cover}
                artFrom={story.title}
                lang={lang}
                fallback={<Kolam seed={story.id} />}
              >
                <h2 className={`story-pick__title ${scriptClass(lang)}`} lang={lang}>
                  {storyTitle(story)}
                </h2>
                <p className="register-status__goal">
                  {story.level ? `Level ${story.level} · ` : ""}
                  {wordCount(story)} words
                  {story.parts && story.parts.length > 1 ? ` · ${story.parts.length} parts` : ""}
                  {story.credit?.publisher
                    ? ` · ${story.credit.publisher}${story.credit.licence ? `, ${story.credit.licence.split(" (")[0]}` : ""}`
                    : ""}
                </p>
                <p className={`story-pick__text ${scriptClass(lang)}`} lang={lang}>
                  {story.text}
                </p>
                <ListenButton text={story.text} lang={lang} />
              </BookPage>
            )}

            <div className="register">
              <table className="register__table" role="radiogroup" aria-label="Stories">
                <tbody>
                  {stories.map((p) => (
                    <tr
                      key={p.id}
                      className="register__row"
                      data-selected={p.id === story?.id}
                    >
                      <td>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={p.id === story?.id}
                          className="register__pick"
                          onClick={() => setPicked(p.id)}
                        >
                          <span className={`register__name ${scriptClass(lang)}`} lang={lang}>
                            {storyTitle(p)}
                          </span>
                          <span className="register__meta">
                            {p.level ? `Level ${p.level} · ` : ""}
                            {wordCount(p)} words
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
