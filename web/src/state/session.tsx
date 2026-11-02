import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Attempt, Part, Passage, Reader } from "../api/types";
import type { Lang } from "../theme/script";
import { newId } from "./ids";
import { load } from "./storage";

/** A recording waiting to be checked by the API. */
export type Pending = {
  audio: Blob | null;
  seconds: number;
  /** Given when the clip is recorded; every send of this clip uses it. */
  requestId?: string;
  /** The clip sounded noisy (`audio/noise.ts`). */
  noisy?: boolean;
};

type SessionValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  reader: Reader | null;
  setReader: (reader: Reader) => void;
  passage: Passage | null;
  parts: Part[];
  beginPassage: (passage: Passage, partTexts: string[]) => void;
  currentPart: number;
  /** Identifies this run of a story, so the result is saved exactly once. */
  sessionId: string | null;
  recordAttempt: (partIndex: number, attempt: Attempt, seconds: number | null) => void;
  goToNextPart: () => void;
  /** Held between recording and the "checking" screen. */
  pending: Pending | null;
  setPending: (pending: Pending | null) => void;
  reset: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  // Starts in the language this device last read in, so the class list matches it.
  const [lang, setLang] = useState<Lang>(() => load().lang);
  const [reader, setReader] = useState<Reader | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [currentPart, setCurrentPart] = useState(1);
  const [pending, setPending] = useState<Pending | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const beginPassage = useCallback((p: Passage, partTexts: string[]) => {
    setPassage(p);
    setParts(partTexts.map((text, index) => ({ index, text, attempt: null, seconds: null })));
    setCurrentPart(1);
    setPending(null);
    setSessionId(newId());
  }, []);

  const recordAttempt = useCallback(
    (partIndex: number, attempt: Attempt, seconds: number | null) => {
      setParts((prev) =>
        prev.map((part) =>
          part.index === partIndex ? { ...part, attempt, seconds } : part,
        ),
      );
    },
    [],
  );

  const goToNextPart = useCallback(() => {
    setCurrentPart((n) => n + 1);
  }, []);

  const reset = useCallback(() => {
    setPassage(null);
    setParts([]);
    setCurrentPart(1);
    setPending(null);
    setSessionId(null);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      lang,
      setLang,
      reader,
      setReader,
      passage,
      parts,
      beginPassage,
      currentPart,
      sessionId,
      recordAttempt,
      goToNextPart,
      pending,
      setPending,
      reset,
    }),
    [
      lang,
      reader,
      passage,
      parts,
      beginPassage,
      currentPart,
      sessionId,
      recordAttempt,
      goToNextPart,
      pending,
      reset,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}
