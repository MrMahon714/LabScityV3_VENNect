import {
  MATCH_PERCENT_FLOORS,
  MATCH_PERCENT_MIN_CEILING,
  MATCH_PERCENT_TOP,
} from "@/lib/constants/matching";
import type { MatchTier } from "@/lib/types/collab";

export function toMatchPercent(
  score: number | null,
  tier: MatchTier,
  ceiling: number,
): number {
  if (score === null || !Number.isFinite(score)) return 0;
  const floor = MATCH_PERCENT_FLOORS[tier] ?? MATCH_PERCENT_FLOORS.offers_only;
  const span = ceiling - floor;
  if (span <= 0) return 0;
  const scaled = (score - floor) / span;
  return Math.round(Math.min(1, Math.max(0, scaled)) * MATCH_PERCENT_TOP);
}

export function rankByMatchPercent<
  T extends { cosine_similarity: number; match_tier: MatchTier },
>(rows: T[]): (T & { match_percent: number })[] {
  const best = rows.reduce(
    (max, row) =>
      Number.isFinite(row.cosine_similarity) && row.cosine_similarity > max
        ? row.cosine_similarity
        : max,
    0,
  );

  const ceiling = Math.max(best, MATCH_PERCENT_MIN_CEILING);

  return rows
    .map((row) => ({
      ...row,
      match_percent: toMatchPercent(
        row.cosine_similarity,
        row.match_tier,
        ceiling,
      ),
    }))
    .sort(
      (a, b) =>
        b.match_percent - a.match_percent ||
        b.cosine_similarity - a.cosine_similarity,
    );
}
