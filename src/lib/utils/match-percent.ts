import { MATCH_PERCENT_ANCHORS } from "@/lib/constants/matching";
import type { MatchTier } from "@/lib/types/collab";

export function toMatchPercent(score: number | null, tier: MatchTier): number {
  if (score === null || !Number.isFinite(score)) return 0;
  const { floor, ceiling } =
    MATCH_PERCENT_ANCHORS[tier] ?? MATCH_PERCENT_ANCHORS.offers_only;
  const scaled = (score - floor) / (ceiling - floor);
  return Math.round(Math.min(1, Math.max(0, scaled)) * 100);
}

export function rankByMatchPercent<
  T extends { cosine_similarity: number; match_tier: MatchTier },
>(rows: T[]): (T & { match_percent: number })[] {
  return rows
    .map((row) => ({
      ...row,
      match_percent: toMatchPercent(row.cosine_similarity, row.match_tier),
    }))
    .sort(
      (a, b) =>
        b.match_percent - a.match_percent ||
        b.cosine_similarity - a.cosine_similarity,
    );
}
