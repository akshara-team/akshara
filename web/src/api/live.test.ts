import { afterEach, describe, expect, it, vi } from "vitest";
import { liveApi } from "./live";

const passage = { id: "kn-1", language: "kn-IN", text: "ಒಂದು. ಎರಡು." };

describe("liveApi parts", () => {
  it("uses the backend's parts", () => {
    expect(liveApi.partsOf({ ...passage, parts: ["ಒಂದು.", "ಎರಡು."] })).toEqual(["ಒಂದು.", "ಎರಡು."]);
  });

  it("reads the whole passage when the backend sends no parts", () => {
    expect(liveApi.partsOf(passage)).toEqual([passage.text]);
    expect(liveApi.partsOf({ ...passage, parts: [] })).toEqual([passage.text]);
  });
});

describe("liveApi.submitAttempt", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch() {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({ words: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  function sentForm(fetchMock: ReturnType<typeof stubFetch>): FormData {
    return fetchMock.mock.calls[0][1]?.body as FormData;
  }

  it("sends the part index so only that part is scored", async () => {
    const fetchMock = stubFetch();
    await liveApi.submitAttempt({ audio: new Blob([]), learner: "a", passageId: "kn-1", partIndex: 1 });
    expect(sentForm(fetchMock).get("part_index")).toBe("1");
  });

  it("omits the part index for a whole-passage reading", async () => {
    const fetchMock = stubFetch();
    await liveApi.submitAttempt({ audio: new Blob([]), learner: "a", passageId: "kn-1" });
    expect(sentForm(fetchMock).has("part_index")).toBe(false);
  });
});
