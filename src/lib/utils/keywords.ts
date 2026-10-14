// Keyword cleaning for ORCID keywords. Keywords are NEVER shown in the UI:
// they only enrich the "offers" text that gets embedded for matching.

// Keep inside the 2-60 character range used elsewhere for user-facing names.
const MIN_KEYWORD_LENGTH = 2;
const MAX_KEYWORD_LENGTH = 60;

/**
 * Trims, collapses whitespace, drops out-of-range lengths and duplicates
 * (case-insensitive, first spelling wins), then keeps at most `max`.
 */
export function cleanKeywords(
  raw: readonly unknown[],
  max: number = Infinity,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of raw) {
    if (typeof item !== "string") continue;
    const keyword = item.replace(/\s+/g, " ").trim();
    if (
      keyword.length < MIN_KEYWORD_LENGTH ||
      keyword.length > MAX_KEYWORD_LENGTH
    )
      continue;

    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(keyword);
    if (result.length >= max) break;
  }

  return result;
}
