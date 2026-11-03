import { PICTURE_PATHS, type PictureName } from "./pictureShapes";

export const PICTURES = Object.keys(PICTURE_PATHS) as PictureName[];

/**
 * The teacher's choice, as stored on the child: "p" and the picture's number ("p3"), short
 * enough for the API's 4-character `avatar` field, which used to hold initials.
 */
export function pictureCode(picture: PictureName): string {
  return `p${PICTURES.indexOf(picture)}`;
}

export function isPictureCode(value: string | null | undefined): value is string {
  return !!value && /^p\d{1,2}$/.test(value) && Number(value.slice(1)) < PICTURES.length;
}

/**
 * A child's own picture. Children of six cannot read their names, least of all in English, so
 * each child is a picture they know (a bird, a cow, a boat). The teacher's choice is used when
 * set; otherwise the picture follows the child's id, so it never changes between visits.
 */
export function pictureOf(id: string | number, chosen?: string | null): PictureName {
  if (isPictureCode(chosen)) return PICTURES[Number(chosen.slice(1))];
  if (chosen && chosen in PICTURE_PATHS) return chosen as PictureName;
  // A class's ids are numbers in order, so neighbours never share a picture.
  const n =
    typeof id === "number" || /^\d+$/.test(id)
      ? Number(id)
      : [...String(id)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  return PICTURES[Math.abs(n) % PICTURES.length];
}
