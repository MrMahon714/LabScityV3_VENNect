import { describe, expect, it } from "vitest";
import { cleanKeywords } from "../keywords";

describe("cleanKeywords", () => {
  it("trims, dedupes case-insensitively and drops bad lengths and non-strings", () => {
    expect(
      cleanKeywords([
        "  Deep   Learning ",
        "deep learning",
        "x",
        "a".repeat(61),
        5,
        "NLP",
      ]),
    ).toEqual(["Deep Learning", "NLP"]);
  });

  it("respects the max", () => {
    expect(cleanKeywords(["aa", "bb", "cc"], 2)).toEqual(["aa", "bb"]);
  });
});
