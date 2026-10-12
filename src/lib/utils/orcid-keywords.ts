import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanKeywords } from "@/lib/utils/keywords";

// Not a "use server" file on purpose: importOrcidKeywordsForUser takes a userId,
// so it must only be callable from other server code, never directly from the browser.
//
// ORCID keywords belong to the PERSON (one list per ORCID record), not to individual
// publications, so they are stored on the profile (profile.orcid_keywords).
// They are never displayed; they only feed the offers embedding used for matching.

const ORCID_API_BASE = "https://pub.orcid.org/v3.0";
const FETCH_TIMEOUT_MS = 8000;

// Upper bound stored per profile (the offers text caps what is embedded even further).
export const MAX_ORCID_KEYWORDS = 30;

/**
 * Turns an ORCID `/keywords` response into a clean, deduplicated list.
 * Defensive on purpose: researchers often put a whole comma-separated list into a
 * single keyword entry ("machine learning, nlp; graph theory"), so entries are split.
 */
export function parseOrcidKeywords(json: unknown): string[] {
  const entries = (json as { keyword?: unknown } | null)?.keyword;
  if (!Array.isArray(entries)) return [];

  const pieces: string[] = [];
  for (const entry of entries) {
    const content = (entry as { content?: unknown } | null)?.content;
    if (typeof content !== "string") continue;
    pieces.push(...content.split(/[,;\n]/));
  }

  return cleanKeywords(pieces);
}

/**
 * Reads the keywords a researcher chose to make public on their ORCID record.
 * Never throws: any failure (network, timeout, non-200, bad JSON) returns [] so it
 * can never break the publication import that calls it.
 * `orcid` must already be normalized (see orcidSchema), e.g. "0000-0002-1825-0097".
 */
export async function fetchOrcidKeywords(orcid: string): Promise<string[]> {
  try {
    const res = await fetch(`${ORCID_API_BASE}/${orcid}/keywords`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`ORCID keywords request failed with status ${res.status}`);
      return [];
    }
    return parseOrcidKeywords(await res.json());
  } catch (err) {
    console.warn("ORCID keywords fetch failed:", err);
    return [];
  }
}

export interface OrcidKeywordImportResult {
  found: number; // usable keywords on the ORCID record
  saved: number; // keywords written to profile.orcid_keywords
}

/**
 * Saves the user's public ORCID keywords to profile.orcid_keywords, replacing the
 * previous list (ORCID is the source of truth for these).
 * If ORCID returns nothing or fails, the stored list is left untouched.
 * Does NOT regenerate the offers embedding; the caller does that afterwards.
 * Never throws.
 */
export async function importOrcidKeywordsForUser(
  supabase: SupabaseClient,
  userId: string,
  orcid: string,
): Promise<OrcidKeywordImportResult> {
  try {
    const keywords = (await fetchOrcidKeywords(orcid)).slice(
      0,
      MAX_ORCID_KEYWORDS,
    );
    if (keywords.length === 0) return { found: 0, saved: 0 };

    const { error } = await supabase
      .from("profile")
      .update({ orcid_keywords: keywords })
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to save ORCID keywords:", error);
      return { found: keywords.length, saved: 0 };
    }

    return { found: keywords.length, saved: keywords.length };
  } catch (err) {
    console.error("ORCID keyword import failed:", err);
    return { found: 0, saved: 0 };
  }
}
