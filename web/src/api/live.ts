import type { Attempt, LearnerSummary, Passage } from "./types";

const BASE = import.meta.env.VITE_API_BASE ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function detail(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string };
    return body.detail ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new ApiError(res.status, await detail(res));
  return (await res.json()) as T;
}

/** Live adapter — talks to FastAPI through the dev proxy (or VITE_API_BASE). */
export const liveApi = {
  listPassages(lang: string): Promise<Passage[]> {
    return getJson<Passage[]>(`/v1/passages?lang=${encodeURIComponent(lang)}`);
  },

  async submitAttempt(args: {
    audio: Blob;
    learner: string;
    passageId: string;
    requestId?: string;
  }): Promise<Attempt> {
    const form = new FormData();
    form.append("audio", args.audio, `${args.passageId}.wav`);
    form.append("learner", args.learner);
    form.append("passage_id", args.passageId);
    const res = await fetch(`${BASE}/v1/attempts`, {
      method: "POST",
      body: form,
      // Idempotent: resending the same id returns the stored result.
      headers: { "X-Request-ID": args.requestId ?? crypto.randomUUID() },
    });
    if (!res.ok) throw new ApiError(res.status, await detail(res));
    return (await res.json()) as Attempt;
  },

  classSummary(): Promise<LearnerSummary[]> {
    return getJson<LearnerSummary[]>("/v1/class/summary");
  },
};
