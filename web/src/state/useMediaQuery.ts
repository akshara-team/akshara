import { useEffect, useState } from "react";

/** Reactive media query. Returns false when matchMedia is unavailable (tests, SSR). */
export function useMediaQuery(query: string): boolean {
  const read = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false;

  const [matches, setMatches] = useState(read);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/**
 * The design's breakpoint between its mobile frames (375px) and its desktop
 * frames (1280 / 1024).
 */
export const DESKTOP_QUERY = "(min-width: 900px)";

export const useIsDesktop = () => useMediaQuery(DESKTOP_QUERY);
