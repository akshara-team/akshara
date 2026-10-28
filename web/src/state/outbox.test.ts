import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { liveApi } from "../api/live";
import type { Attempt } from "../api/types";
import { MAX_TRIES, enqueue, flush, queued, resetOutbox, retryable, type Queued } from "./outbox";
import { newId } from "./ids";

const ATTEMPT = { request_id: "x" } as unknown as Attempt;

function reading(requestId: string, at = Date.now()): Omit<Queued, "tries"> {
  return {
    requestId, at, audio: null, learner: "Asha", childId: 1, session: "s1",
    passageId: "kn-101", title: null, lang: "kn-IN", partIndex: 0,
  }; // prettier-ignore
}

const status = (s: number) => Object.assign(new Error(String(s)), { status: s });

beforeEach(() => resetOutbox());

describe("the offline queue", () => {
  it("sends oldest first and empties", async () => {
    await enqueue(reading("b", 2));
    await enqueue(reading("a", 1));
    const sent: string[] = [];
    const r = await flush(async (q) => (sent.push(q.requestId), ATTEMPT));
    expect(sent).toEqual(["a", "b"]);
    expect(r).toEqual({ sent: 2, dropped: 0, left: 0 });
    expect(await queued()).toEqual([]);
  });

  it("keeps everything and stops when the connection is still down", async () => {
    await enqueue(reading("a", 1));
    await enqueue(reading("b", 2));
    let calls = 0;
    const r = await flush(async () => {
      calls++;
      throw new TypeError("Failed to fetch");
    });
    expect(calls).toBe(1);
    expect(r.left).toBe(2);
    expect((await queued()).map((q) => [q.requestId, q.tries])).toEqual([["a", 1], ["b", 0]]);
  });

  it("drops a reading the server refuses, and one that keeps failing", async () => {
    await enqueue(reading("gone", 1));
    expect((await flush(async () => Promise.reject(status(404)))).dropped).toBe(1);
    await enqueue(reading("bad", 1));
    for (let i = 0; i < MAX_TRIES; i++) await flush(async () => Promise.reject(status(500)));
    expect(await queued()).toEqual([]);
  });

  it("knows which failures are worth another try", () => {
    expect(retryable(new TypeError("Failed to fetch"))).toBe(true);
    expect(retryable(status(503))).toBe(true);
    expect(retryable(status(429))).toBe(true);
    expect(retryable(status(404))).toBe(false);
    expect(retryable(status(413))).toBe(false);
  });

  it("runs one send at a time, so two triggers do not send twice", async () => {
    await enqueue(reading("a"));
    let calls = 0;
    const send = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 10));
      return ATTEMPT;
    };
    await Promise.all([flush(send), flush(send)]);
    expect(calls).toBe(1);
  });

  it("holds one copy of a reading queued twice", async () => {
    await enqueue(reading("a"));
    await enqueue(reading("a"));
    expect(await queued()).toHaveLength(1);
  });
});

describe("a reading made offline is scored once after reconnecting (WP9 done-when)", () => {
  const real = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = real;
  });

  it("every send of the clip carries the same request id", async () => {
    // The server scores a repeated request id once (tests/test_offline.py); here it records
    // which ids reach it.
    const arrived: string[] = [];
    const ids: string[] = [];
    let network: "down" | "drops reply" | "up" = "down";
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      const id = (init.headers as Record<string, string>)["X-Request-ID"];
      ids.push(id);
      if (network === "down") throw new TypeError("Failed to fetch");
      arrived.push(id);
      if (network === "drops reply") throw new TypeError("Failed to fetch");
      return new Response(JSON.stringify({ request_id: id }), { status: 200 });
    }) as typeof fetch;

    const id = newId();
    await enqueue({ ...reading(id), audio: new Blob(["RIFF"], { type: "audio/wav" }) });
    const send = (q: Queued) =>
      liveApi.submitAttempt({ ...q, audio: q.audio ?? new Blob([]), requestId: q.requestId });

    await flush(send); // still offline
    network = "drops reply"; // reached the server, the reply was lost
    await flush(send);
    network = "up";
    const r = await flush(send);

    expect(r.sent).toBe(1);
    expect(await queued()).toEqual([]);
    expect(new Set(ids)).toEqual(new Set([id]));
    expect(arrived).toEqual([id, id]); // it reached the server twice, as the same reading
  });
});
