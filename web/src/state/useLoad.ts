import { useEffect, useState, type DependencyList } from "react";

/**
 * Runs `load` when `deps` change and keeps the latest answer. A late answer from an older
 * run is dropped, so a quick switch between children never shows the wrong one.
 */
export function useLoad<T>(load: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    load().then(
      (value) => alive && setData(value),
      (e: unknown) => alive && setError(e ?? new Error("failed")),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  return { data, error, reload: () => setVersion((v) => v + 1) };
}
