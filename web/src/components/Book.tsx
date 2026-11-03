import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { WordOut } from "../api/types";
import { play } from "../audio/playback";
import type { Cover } from "../data/covers";
import { t, type CopyKey } from "../i18n";
import { useDocumentTitle } from "../state/useDocumentTitle";
import { scriptClass, type Lang } from "../theme/script";
import { PICTURE_PATHS, type PictureName } from "./pictureShapes";
import { CheckIcon, MicIcon, QuestionIcon, SwapIcon, VolumeIcon } from "./icons";

/* The child's screens, assembled from a few parts that never style themselves differently:
   the frame (voice control, focal object, one action), the book page, the slate and its
   akshara tiles, words marked in place, and the child's own mark. See DESIGN.md. */

/**
 * The voice control, top left on every child screen: tap it and the screen's line is said in
 * the child's language. While the app listens, its ring follows the microphone level.
 */
export function VoiceControl({
  lang,
  line,
  level,
}: {
  lang: Lang;
  line: string;
  /** Microphone level 0..1 while listening; absent when not listening. */
  level?: number;
}) {
  const [speaking, setSpeaking] = useState(false);
  const listening = level !== undefined;
  return (
    <button
      type="button"
      className="voice"
      data-listening={listening}
      data-speaking={speaking}
      aria-label={`${t(lang, "say.label")}: ${line}`}
      onClick={async () => {
        if (speaking) return;
        setSpeaking(true);
        try {
          await play(line, lang);
        } finally {
          setSpeaking(false);
        }
      }}
      style={{ "--lvl": Math.max(0, Math.min(1, level ?? 0)) } as CSSProperties}
    >
      <span className="voice__ring" aria-hidden="true" />
      {listening ? <MicIcon width={28} height={28} /> : <VolumeIcon width={28} height={28} />}
    </button>
  );
}

/** A child's own picture (bird, boat, tree...), drawn in chalk on a small slate. */
export function ChildMark({ picture, size = "sm" }: { picture: PictureName; size?: "sm" | "lg" }) {
  return (
    <span className={`child-mark child-mark--${size}`} aria-hidden="true">
      <svg viewBox="0 0 256 256" focusable="false">
        {PICTURE_PATHS[picture].map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    </span>
  );
}

/** The one action of a child screen: 76 px tall, full width, a picture before the words. */
export function Action({
  tone = "peacock",
  icon,
  children,
  ...rest
}: {
  tone?: "peacock" | "turmeric" | "leaf";
  icon?: ReactNode;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`action action--${tone}`} {...rest}>
      {icon && (
        <span className="action__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="action__label">{children}</span>
    </button>
  );
}

/**
 * Every child screen: a top bar with the voice control and the screen's line on the left and
 * the child's mark on the right, the focal object in the middle (no scrolling on a phone), and
 * one action fixed at the bottom.
 */
export function ChildFrame({
  lang,
  line,
  lineKey,
  vars,
  level,
  mark,
  title,
  surface = "book",
  action,
  heading = false,
  children,
}: {
  lang: Lang;
  /** The line is the screen's heading (screens whose focal object has no title of its own). */
  heading?: boolean;
  /** The screen's spoken line, at most 60 characters; or give `lineKey`. */
  line?: string;
  lineKey?: CopyKey;
  vars?: Record<string, string | number>;
  level?: number;
  /** The reader's picture, linking back to "who is reading". */
  mark?: PictureName | null;
  /** The browser tab's title (English: it is for adults). */
  title: string;
  surface?: "book" | "slate";
  action?: ReactNode;
  children: ReactNode;
}) {
  useDocumentTitle(title);
  const said = line ?? (lineKey ? t(lang, lineKey, vars) : "");
  return (
    <div className="frame" data-surface={surface}>
      <div className="frame__bar">
        <VoiceControl lang={lang} line={said} level={level} />
        {heading ? (
          <h1 className={`frame__line ${scriptClass(lang)}`} lang={lang}>
            {said}
          </h1>
        ) : (
          <p className={`frame__line ${scriptClass(lang)}`} lang={lang} aria-live="polite">
            {said}
          </p>
        )}
        {mark && (
          <Link className="frame__mark" to="/switch" aria-label={t(lang, "home.notMe")}>
            <ChildMark picture={mark} />
          </Link>
        )}
      </div>
      <div className="frame__focal">{children}</div>
      {action && <div className="frame__action">{action}</div>}
    </div>
  );
}

/**
 * Credit for a StoryWeaver picture, wherever it is shown (CC BY 4.0). The demo's text is the
 * book's catalogue description, so the credit names the book the picture comes from.
 */
export function ArtCredit({
  cover,
  from,
  lang,
}: {
  cover: Cover;
  from?: string | null;
  /** The book title's language. */
  lang?: Lang;
}) {
  return (
    <span className="art-credit">
      <span lang="en">Picture from </span>
      {from ? <cite lang={lang} className={lang ? scriptClass(lang) : undefined}>{from}</cite> : <span lang="en">StoryWeaver</span>}
      <span lang="en">
        : {cover.illustrator}, {cover.publisher}, CC BY 4.0
      </span>
    </span>
  );
}

/**
 * The picture-book page: the book's art on top (on a tablet in landscape, on the left), the
 * text below in reading type. Without art, the story's kolam stands in.
 */
export function BookPage({
  art,
  artFrom,
  lang,
  fallback,
  children,
  className,
}: {
  art?: Cover | null;
  /** The book the picture comes from, for its credit, and its language. */
  artFrom?: string | null;
  lang?: Lang;
  /** Shown in the art's place when the book has no picture here. */
  fallback?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={["book-page", className].filter(Boolean).join(" ")}>
      {art ? (
        <figure className="book-page__art">
          <img
            src={`${import.meta.env.BASE_URL}${art.src}`}
            alt=""
            width={708}
            height={708}
            decoding="async"
          />
          <figcaption>
            <ArtCredit cover={art} from={artFrom} lang={lang} />
          </figcaption>
        </figure>
      ) : fallback ? (
        <div className="book-page__art book-page__art--kolam">{fallback}</div>
      ) : null}
      <div className="book-page__text">{children}</div>
    </article>
  );
}

/** The slate: a dark board with a thin wooden frame line, where practice happens. */
export function Slate({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={["slate", className].filter(Boolean).join(" ")}>{children}</div>;
}

export type WordStatus = "correct" | "substituted" | "skipped" | "uncertain";

/** A scorer word (`op` + `check`) as one of the four marks. */
export function wordStatus(w: { op: string; check?: boolean }): WordStatus {
  if (w.check) return "uncertain";
  if (w.op === "substituted") return "substituted";
  if (w.op === "skipped") return "skipped";
  return "correct";
}

export type TileState = "idle" | "lit" | "ok";

/** One akshara in chalk on its own tile. */
export function AksharaTile({
  akshara,
  lang,
  state = "idle",
  index,
}: {
  akshara: string;
  lang: Lang;
  state?: TileState;
  index: number;
}) {
  return (
    <span
      className={`tile ${scriptClass(lang)}`}
      data-state={state}
      lang={lang}
      aria-hidden="true"
      style={{ "--i": index } as CSSProperties}
    >
      {akshara}
    </span>
  );
}

const MARK_ICON: Record<WordStatus, ReactNode> = {
  correct: <CheckIcon width={16} height={16} />,
  substituted: <SwapIcon width={16} height={16} />,
  skipped: null, // an empty kolam dot, drawn in CSS: never a cross
  uncertain: <QuestionIcon width={16} height={16} />,
};

const MARK_SAID: Record<WordStatus, CopyKey> = {
  correct: "chip.correct",
  substituted: "chip.substituted",
  skipped: "chip.skipped",
  uncertain: "chip.check",
};

/**
 * The page's words, each marked where it stands, in reading order: read right (leaf, tick),
 * read as another word (turmeric, swap), skipped (an empty laterite dot), not sure (ink,
 * question mark). Tap a word to hear it. Marks never rely on colour alone.
 */
const MARK_SAID_EN: Record<WordStatus, string> = {
  correct: "read correctly",
  substituted: "read as a different word",
  skipped: "skipped",
  uncertain: "check this word",
};

export function MarkedText({
  words,
  lang,
  forTeacher = false,
}: {
  words: WordOut[];
  lang: Lang;
  /** On a teacher screen the marks are named in English, with the word that was heard. */
  forTeacher?: boolean;
}) {
  return (
    <p className={`marked ${scriptClass(lang)}`} lang={lang} data-long={words.length > 10}>
      {words.map((w, i) => {
        const status = wordStatus(w);
        const heard = forTeacher && status === "substituted" && w.said ? w.said : null;
        return (
          <span key={`${w.index ?? i}-${w.word ?? ""}`}>
            <button
              type="button"
              // keep-motion: under reduced motion the marks still fade in (no rise); see book.css.
              className="mark keep-motion"
              data-status={status}
              title={heard ? `Heard as ${heard}` : undefined}
              style={{ "--i": i } as CSSProperties}
              onClick={() => void play(w.word ?? "", lang)}
            >
              <span className="mark__word">{w.word}</span>
              <span className="mark__sign" aria-hidden="true">
                {MARK_ICON[status]}
              </span>
              {forTeacher ? (
                <span className="sr-only" lang="en">
                  , {MARK_SAID_EN[status]}
                  {heard ? `, heard as ${heard}` : ""}
                </span>
              ) : (
                <span className="sr-only">, {t(lang, MARK_SAID[status])}</span>
              )}
            </button>{" "}
          </span>
        );
      })}
    </p>
  );
}
