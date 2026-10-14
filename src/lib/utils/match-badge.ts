// Border color for a "% Match" badge.
// Red: 0–50%, Yellow: 51–79%, Green: 80%+
export type MatchColor = "red" | "yellow" | "green";

export function getMatchColor(matchPercent: number): MatchColor {
  const rounded = Math.round(matchPercent);
  if (rounded >= 80) return "green";
  if (rounded >= 51) return "yellow";
  return "red";
}