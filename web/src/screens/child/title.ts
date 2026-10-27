import type { Passage } from "../../api/types";

/** A story's title: the catalogue title, else its first few words. */
export function storyTitle(passage: Passage | null): string {
  if (!passage) return "";
  if (passage.title) return passage.title;
  const words = passage.text.split(/\s+/).filter(Boolean);
  return words.slice(0, 4).join(" ") + (words.length > 4 ? "…" : "");
}
