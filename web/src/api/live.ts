import type { Attempt, Child, ChildInput, Passage, Reading } from "./types";

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

async function sendJson<T>(method: "POST" | "PATCH", path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, await detail(res));
  return (await res.json()) as T;
}

/** Live adapter — talks to FastAPI through the dev proxy (or VITE_API_BASE). */
export const liveApi = {
  /** The backend's parts; an older backend sends none, so the passage is read whole. */
  partsOf(passage: Passage): string[] {
    return passage.parts?.length ? passage.parts : [passage.text];
  },

  listPassages(lang: string): Promise<Passage[]> {
    return getJson<Passage[]>(`/v1/passages?lang=${encodeURIComponent(lang)}`);
  },

  async submitAttempt(args: {
    audio: Blob;
    learner: string;
    /** A child the teacher added; preferred over the bare `learner` alias. */
    childId?: number;
    /** Groups the parts of one story into one reading. */
    session?: string;
    passageId: string;
    /** Which part was read; scored against that part only. Omit for the whole passage. */
    partIndex?: number;
    requestId?: string;
  }): Promise<Attempt> {
    const form = new FormData();
    form.append("audio", args.audio, `${args.passageId}.wav`);
    if (args.childId !== undefined) form.append("child_id", String(args.childId));
    else form.append("learner", args.learner);
    if (args.session) form.append("session", args.session);
    form.append("passage_id", args.passageId);
    if (args.partIndex !== undefined) form.append("part_index", String(args.partIndex));
    const res = await fetch(`${BASE}/v1/attempts`, {
      method: "POST",
      body: form,
      // Idempotent: resending the same id returns the stored result.
      headers: { "X-Request-ID": args.requestId ?? crypto.randomUUID() },
    });
    if (!res.ok) throw new ApiError(res.status, await detail(res));
    return (await res.json()) as Attempt;
  },

  listChildren(lang?: string): Promise<Child[]> {
    return getJson<Child[]>(lang ? `/v1/children?lang=${encodeURIComponent(lang)}` : "/v1/children");
  },

  getChild(id: number): Promise<Child> {
    return getJson<Child>(`/v1/children/${id}`);
  },

  addChild(input: ChildInput): Promise<Child> {
    return sendJson<Child>("POST", "/v1/children", input);
  },

  editChild(id: number, patch: Partial<ChildInput>): Promise<Child> {
    return sendJson<Child>("PATCH", `/v1/children/${id}`, patch);
  },

  childReadings(id: number): Promise<Reading[]> {
    return getJson<Reading[]>(`/v1/children/${id}/readings`);
  },

  /** Timbre pronunciation of one word; null when the endpoint says no. */
  async feedbackAudio(word: string, lang: string): Promise<Blob | null> {
    const url = `${BASE}/v1/feedback/audio?lang=${encodeURIComponent(lang)}&word=${encodeURIComponent(word)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.blob();
  },
};
