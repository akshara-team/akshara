import type { Passage } from "../api/types";

/**
 * Cover art for stories, from the StoryWeaver book each passage comes from (CC BY 4.0).
 * Self-hosted in `public/covers/`, credited wherever shown. Only books with art here get a
 * picture; any other story shows the activity-card symbol instead, never borrowed art.
 */
export type Cover = { src: string; illustrator: string; publisher: string };

const COVERS: Record<string, Cover> = {
  // மஞ்சள் குடை (The Yellow Umbrella), the Tamil demo story.
  "591721": { src: "covers/sw-591721.jpg", illustrator: "Poojana Prasanna", publisher: "Pratham Books" },
  // सी-सी सीटी, the Hindi demo story.
  "204765": {
    src: "covers/sw-204765.jpg",
    illustrator: "Partho Sengupta",
    publisher: "Pratham Education Foundation",
  },
};

/** The StoryWeaver book id behind a passage: from its id ("sw-591721") or its credit link. */
export function storyweaverId(passage: Pick<Passage, "id" | "credit">): string | null {
  const fromId = /^sw-(\d+)/.exec(passage.id);
  if (fromId) return fromId[1];
  const fromUrl = /\/stories\/(\d+)/.exec(passage.credit?.url ?? "");
  return fromUrl ? fromUrl[1] : null;
}

export function coverFor(passage: Pick<Passage, "id" | "credit">): Cover | null {
  const id = storyweaverId(passage);
  return id ? (COVERS[id] ?? null) : null;
}
