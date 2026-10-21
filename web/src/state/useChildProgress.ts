import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { LearnerSummary } from "../api/types";
import { load, type ChildStore } from "./storage";

/**
 * The child's progress: the local reading history, plus the learner's row from
 * `GET /v1/class/summary` when the API answers. The API has no per-attempt
 * endpoint, so local readings are the history and the API row is a synced total.
 * A failure is ignored; it must never break the home screen.
 */
export function useChildProgress() {
  const [store, setStore] = useState<ChildStore>(() => load());
  const [synced, setSynced] = useState<LearnerSummary | null>(null);

  const refresh = useCallback(() => setStore(load()), []);

  useEffect(() => {
    const alias = store.reader?.alias;
    if (!alias) {
      setSynced(null);
      return;
    }
    let alive = true;
    api
      .classSummary()
      .then((rows) => {
        if (alive) setSynced(rows.find((r) => r.alias === alias) ?? null);
      })
      .catch(() => {
        if (alive) setSynced(null);
      });
    return () => {
      alive = false;
    };
  }, [store.reader]);

  return { store, synced, refresh };
}
