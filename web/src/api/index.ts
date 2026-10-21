import type { Lang } from "../theme/script";
import { liveApi } from "./live";
import { MOCK_PARTS, mockAttempt, mockPassages } from "./mock";
import type { Attempt, Passage } from "./types";

/**
 * The one seam between the screens and the backend. `mock` runs the whole app
 * with no server (the design's demo data); `live` talks to FastAPI /v1.
 * Pick with VITE_API_MODE in web/.env.
 */
export type Api = {
  listPassages: (lang: Lang) => Promise<Passage[]>;
  /** Split a passage into the parts the child reads one at a time. */
  partsOf: (passage: Passage) => string[];
  submitAttempt: (args: {
    audio: Blob;
    learner: string;
    passageId: string;
    lang: Lang;
    partIndex: number;
  }) => Promise<Attempt>;
};

const mock: Api = {
  listPassages: async (lang) => mockPassages(lang),
  partsOf: () => MOCK_PARTS.map((p) => p.text),
  submitAttempt: async ({ passageId, lang, partIndex }) =>
    mockAttempt(passageId, lang, partIndex),
};

const live: Api = {
  listPassages: (lang) => liveApi.listPassages(lang),
  // The backend serves whole passages; one part until chunking exists.
  partsOf: (passage) => [passage.text],
  submitAttempt: ({ audio, learner, passageId }) =>
    liveApi.submitAttempt({ audio, learner, passageId }),
};

export const isMock = import.meta.env.VITE_API_MODE !== "live";

export const api: Api = isMock ? mock : live;
