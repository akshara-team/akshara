import { useEffect, useState } from "react";
import type { Attempt } from "../api/types";
import type { Lang } from "../theme/script";

/**
 * Readings recorded with no connection wait here and are sent when it comes back. Each keeps
 * the `requestId` it was given when it was recorded, and the server answers a repeated id with
 * the stored result (no second Prisma call, no second lesson for the learner model), so a send
 * that is cut off halfway and tried again never makes a duplicate.
 *
 * Kept in IndexedDB, because a recording is a Blob too big for localStorage. Where IndexedDB is
 * missing (tests, some private modes) the queue lives in memory for the visit.
 */

export type Queued = {
  requestId: string;
  /** Null only in mock mode, where the demo reading has no audio. */
  audio: Blob | null;
  learner: string;
  childId?: number;
  session?: string;
  passageId: string;
  title: string | null;
  lang: Lang;
  partIndex: number;
  /** When it was recorded, unix ms. */
  at: number;
  tries: number;
};

type Box = {
  all: () => Promise<Queued[]>;
  put: (q: Queued) => Promise<void>;
  remove: (requestId: string) => Promise<void>;
};

const DB = "akshara-outbox";
const STORE = "readings";
export const CHANGED = "akshara:outbox";

function memoryBox(): Box {
  const rows = new Map<string, Queued>();
  return {
    all: async () => [...rows.values()],
    put: async (q) => void rows.set(q.requestId, q),
    remove: async (id) => void rows.delete(id),
  };
}

function idbBox(factory: IDBFactory): Box {
  let opened: Promise<IDBDatabase> | null = null;
  const open = () =>
    (opened ??= new Promise((resolve, reject) => {
      const req = factory.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "requestId" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  const run = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  };
  return {
    all: () => run("readonly", (s) => s.getAll() as IDBRequest<Queued[]>),
    put: async (q) => void (await run("readwrite", (s) => s.put(q))),
    remove: async (id) => void (await run("readwrite", (s) => s.delete(id))),
  };
}

let box: Box | null = null;

function outbox(): Box {
  if (box) return box;
  try {
    box = typeof indexedDB !== "undefined" && indexedDB ? idbBox(indexedDB) : memoryBox();
  } catch {
    box = memoryBox();
  }
  return box;
}

/** Tests: start from an empty, in-memory queue. */
export function resetOutbox(): void {
  box = memoryBox();
  flushing = null;
}

function changed(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGED));
}

export async function enqueue(q: Omit<Queued, "tries">): Promise<void> {
  await outbox().put({ ...q, tries: 0 });
  changed();
}

export async function queued(): Promise<Queued[]> {
  try {
    return (await outbox().all()).sort((a, b) => a.at - b.at);
  } catch {
    return [];
  }
}

/** Whether a failed send is worth trying again later: no answer, or the server is struggling. */
export function retryable(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status !== "number") return true; // fetch never reached a server
  return status === 408 || status === 429 || status >= 500;
}

export type FlushResult = { sent: number; dropped: number; left: number };

let flushing: Promise<FlushResult> | null = null;

/** A reading that has failed this often is dropped, so one bad clip cannot block the rest. */
export const MAX_TRIES = 20;

/**
 * Send the waiting readings, oldest first. Stops at the first one that cannot get through (the
 * connection is still bad) and keeps it. A reading the server refuses outright (for example a
 * child the teacher has since deleted) is dropped, since sending it again cannot help, and so
 * is one that has failed MAX_TRIES times.
 * One flush at a time per tab; a second call joins the one running.
 */
export function flush(send: (q: Queued) => Promise<Attempt>): Promise<FlushResult> {
  flushing ??= (async () => {
    const result: FlushResult = { sent: 0, dropped: 0, left: 0 };
    const rows = await queued();
    for (let i = 0; i < rows.length; i++) {
      const q = rows[i];
      try {
        await send(q);
        await outbox().remove(q.requestId);
        result.sent++;
      } catch (e) {
        if (retryable(e) && q.tries + 1 < MAX_TRIES) {
          await outbox().put({ ...q, tries: q.tries + 1 });
          result.left = rows.length - i;
          break;
        }
        await outbox().remove(q.requestId);
        result.dropped++;
      }
    }
    if (result.sent || result.dropped) changed();
    return result;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** How many readings are waiting; updates when the queue changes. */
export function useQueuedCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const update = () => void queued().then((rows) => alive && setCount(rows.length));
    update();
    window.addEventListener(CHANGED, update);
    return () => {
      alive = false;
      window.removeEventListener(CHANGED, update);
    };
  }, []);
  return count;
}

const RETRY_MS = 30_000;

/**
 * Keeps sending: when the app opens, when the browser says it is back online, and every 30 s
 * while anything waits (the `online` event is not reliable on every phone).
 */
export function useOutboxSync(send: (q: Queued) => Promise<Attempt>): void {
  useEffect(() => {
    const go = () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      void queued().then((rows) => {
        if (rows.length) void flush(send);
      });
    };
    go();
    window.addEventListener("online", go);
    const timer = setInterval(go, RETRY_MS);
    return () => {
      window.removeEventListener("online", go);
      clearInterval(timer);
    };
  }, [send]);
}
