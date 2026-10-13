import type { MatchFilters } from "@/lib/validations/matching";

//Builds the text that gets embedded for a filtered search (VDT-79).

export function buildFilterSearchText(filters: MatchFilters): string {
  const parts: string[] = [];
  const names = (chips: { name: string }[]) =>
    chips.map((chip) => chip.name).join(", ");

  if (filters.skills.length) {
    parts.push(`Skills: ${names(filters.skills)}`);
  }
  if (filters.expertise.length) {
    parts.push(`Research Areas: ${names(filters.expertise)}`);
  }
  if (filters.publicationKeywords.length) {
    parts.push(`Publication Topics: ${filters.publicationKeywords.join(", ")}`);
  }
  if (filters.productKeywords.length) {
    parts.push(`Products: ${filters.productKeywords.join(", ")}`);
  }

  return parts.join("\n");
}
