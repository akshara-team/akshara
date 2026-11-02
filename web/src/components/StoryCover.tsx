import type { Passage } from "../api/types";
import { coverFor } from "../data/covers";
import { scriptClass, type Lang } from "../theme/script";

type Props = {
  passage: Pick<Passage, "id" | "credit" | "title">;
  lang: Lang;
  /** "lg" on the home story card, "sm" in lists. */
  size?: "lg" | "sm";
};

/** The title's first written unit (a letter with its marks), via the browser's segmenter. */
function firstAkshara(text: string): string {
  const t = text.normalize("NFC").trim();
  if (!t) return "";
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    for (const { segment } of seg.segment(t)) return segment;
  }
  return Array.from(t)[0];
}

/**
 * A story's picture. Real StoryWeaver art with its credit (CC BY 4.0) when the book has a
 * cover here; otherwise the classroom activity card: the title's first akshara, large.
 */
export function StoryCover({ passage, lang, size = "lg" }: Props) {
  const cover = coverFor(passage);
  const title = passage.title ?? "";
  if (cover) {
    return (
      <figure className={`story-cover story-cover--${size}`}>
        <img
          src={`${import.meta.env.BASE_URL}${cover.src}`}
          alt=""
          width={708}
          height={708}
          loading={size === "lg" ? "eager" : "lazy"}
          decoding="async"
        />
        {size === "lg" && (
          <figcaption className="story-cover__credit">
            Picture: {cover.illustrator}, {cover.publisher}, CC BY 4.0
          </figcaption>
        )}
      </figure>
    );
  }
  const first = firstAkshara(title);
  return (
    <div className={`story-cover story-cover--${size} story-cover--card`} aria-hidden="true">
      <span className={`story-cover__glyph ${scriptClass(lang)}`} lang={lang}>
        {first || "?"}
      </span>
    </div>
  );
}
