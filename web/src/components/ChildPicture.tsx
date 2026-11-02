import { PICTURE_PATHS, type PictureName } from "./pictureShapes";

export const PICTURES = Object.keys(PICTURE_PATHS) as PictureName[];

/** The colour field behind each picture, from the classroom card hues. */
const FIELD = ["read", "practice", "reward", "skip", "teacher"] as const;

/**
 * A child's own picture. Children of six cannot read their names, least of all in English, so
 * each child is a picture they know (a bird, a cow, a boat). The teacher's choice is used when
 * set; otherwise the picture follows the child's id, so it never changes between visits.
 */
export function pictureOf(id: string | number, chosen?: string | null): PictureName {
  if (chosen && chosen in PICTURE_PATHS) return chosen as PictureName;
  // A class's ids are numbers in order, so neighbours never share a picture.
  const n =
    typeof id === "number" || /^\d+$/.test(id)
      ? Number(id)
      : [...String(id)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  return PICTURES[Math.abs(n) % PICTURES.length];
}

export function ChildPicture({
  picture,
  size = "md",
  selected = false,
}: {
  picture: PictureName;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
}) {
  const field = FIELD[PICTURES.indexOf(picture) % FIELD.length];
  return (
    <span
      className={`child-pic child-pic--${size}`}
      data-field={field}
      data-selected={selected}
      aria-hidden="true"
    >
      <svg viewBox="0 0 256 256" focusable="false">
        {PICTURE_PATHS[picture].map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    </span>
  );
}
