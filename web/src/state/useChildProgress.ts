import { useCallback, useEffect, useState } from "react";
import { api, childIdOf, statusOf } from "../api";
import type { Child } from "../api/types";
import { EMPTY_STORE, load, save, type ChildStore } from "./storage";

/**
 * The child's progress: the reading history saved on this device, plus the child's record
 * from `GET /v1/children/{id}` when the reader is a child the teacher added. A network
 * failure is ignored; it must never break the home screen. A saved reader the class no
 * longer has (removed, or an old demo name) is `gone`, so the child picks their name again.
 */
export function useChildProgress() {
  const [store, setStore] = useState<ChildStore>(() => load());
  const [synced, setSynced] = useState<Child | null>(null);
  const [gone, setGone] = useState(false);

  const refresh = useCallback(() => setStore(load()), []);

  // Forget a reader the class no longer has, with their local history (it was theirs, and
  // this may be a shared phone). The language stays.
  useEffect(() => {
    if (gone && store.reader) setStore(save({ ...EMPTY_STORE, lang: store.lang }));
  }, [gone, store]);

  useEffect(() => {
    const id = childIdOf(store.reader?.id);
    setGone(Boolean(store.reader) && id === undefined);
    if (id === undefined) {
      setSynced(null);
      return;
    }
    let alive = true;
    api
      .getChild(id)
      .then((child) => alive && setSynced(child))
      .catch((e: unknown) => {
        if (!alive) return;
        setSynced(null);
        if (statusOf(e) === 404) setGone(true);
      });
    return () => {
      alive = false;
    };
  }, [store.reader]);

  return { store, synced, gone, refresh };
}
