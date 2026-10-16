import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchOrcidKeywords,
  importOrcidKeywordsForUser,
  MAX_ORCID_KEYWORDS,
  parseOrcidKeywords,
} from "../orcid-keywords";

const orcidResponse = (...contents: string[]) => ({
  keyword: contents.map((content) => ({ content, visibility: "public" })),
});

function mockFetchJson(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok, status, json: async () => body }),
  );
}

function fakeSupabase(updateError: unknown = null) {
  const eq = vi.fn().mockResolvedValue({ error: updateError });
  const update = vi.fn((_values: { orcid_keywords: string[] }) => ({ eq }));
  const from = vi.fn(() => ({ update }));
  const client = { from } as unknown as SupabaseClient;
  return { client, from, update, eq };
}

afterEach(() => vi.unstubAllGlobals());

describe("parseOrcidKeywords", () => {
  it("returns [] for missing or malformed responses", () => {
    expect(parseOrcidKeywords(null)).toEqual([]);
    expect(parseOrcidKeywords({})).toEqual([]);
    expect(parseOrcidKeywords({ keyword: "nope" })).toEqual([]);
    expect(parseOrcidKeywords({ keyword: [null, {}, { content: 5 }] })).toEqual(
      [],
    );
  });

  it("splits comma/semicolon separated entries and trims whitespace", () => {
    expect(
      parseOrcidKeywords(
        orcidResponse("machine learning,  NLP ; graph   theory"),
      ),
    ).toEqual(["machine learning", "NLP", "graph theory"]);
  });

  it("dedupes case-insensitively, keeping the first spelling", () => {
    expect(
      parseOrcidKeywords(orcidResponse("Deep Learning", "deep learning")),
    ).toEqual(["Deep Learning"]);
  });
});

describe("fetchOrcidKeywords", () => {
  it("asks for JSON and parses the keywords", async () => {
    mockFetchJson(orcidResponse("Quantum Optics"));
    expect(await fetchOrcidKeywords("0000-0002-1825-0097")).toEqual([
      "Quantum Optics",
    ]);
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(url).toBe("https://pub.orcid.org/v3.0/0000-0002-1825-0097/keywords");
    expect(init.headers.Accept).toBe("application/json");
  });

  it("returns [] on a non-200 response or a thrown error", async () => {
    mockFetchJson({}, false, 404);
    expect(await fetchOrcidKeywords("0000-0002-1825-0097")).toEqual([]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    expect(await fetchOrcidKeywords("0000-0002-1825-0097")).toEqual([]);
  });
});

describe("importOrcidKeywordsForUser", () => {
  it("stores the keywords on the profile (one list per person)", async () => {
    mockFetchJson(orcidResponse("Photonics, Bioimaging"));
    const { client, from, update, eq } = fakeSupabase();

    const result = await importOrcidKeywordsForUser(
      client,
      "user-1",
      "0000-0002-1825-0097",
    );

    expect(result).toEqual({ found: 2, saved: 2 });
    expect(from).toHaveBeenCalledWith("profile");
    expect(update).toHaveBeenCalledWith({
      orcid_keywords: ["Photonics", "Bioimaging"],
    });
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("caps the stored list at MAX_ORCID_KEYWORDS", async () => {
    mockFetchJson(
      orcidResponse(
        Array.from({ length: 50 }, (_, i) => `keyword ${i}`).join(", "),
      ),
    );
    const { client, update } = fakeSupabase();

    await importOrcidKeywordsForUser(client, "user-1", "0000-0002-1825-0097");

    expect(update.mock.calls[0][0].orcid_keywords).toHaveLength(
      MAX_ORCID_KEYWORDS,
    );
  });

  it("leaves the stored list untouched when ORCID returns nothing or fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    const { client, update } = fakeSupabase();

    await expect(
      importOrcidKeywordsForUser(client, "user-1", "0000-0002-1825-0097"),
    ).resolves.toEqual({
      found: 0,
      saved: 0,
    });
    expect(update).not.toHaveBeenCalled();
  });
});
