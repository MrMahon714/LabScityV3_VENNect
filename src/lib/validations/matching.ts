import { z } from "zod";
import {
  CAREER_STAGES,
  MATCHING_PRODUCT_TYPES,
  MAX_FILTER_CHIPS,
  MAX_FILTER_TEXT_LENGTH,
} from "../constants/matching";

const chipText = z.string().trim().min(1).max(MAX_FILTER_TEXT_LENGTH);

const pickedOrCustomChip = z.object({
  id: z.number().int().positive().nullable(),
  name: chipText,
});

/**
 * Filters sent by the Matching ALgoorithm.
 * Every field is optional: missing fields fall back to "no filter".
 */
export const matchFiltersSchema = z.object({
  skills: z.array(pickedOrCustomChip).max(MAX_FILTER_CHIPS).default([]),
  skillsMustHave: z.boolean().default(false),
  expertise: z.array(pickedOrCustomChip).max(MAX_FILTER_CHIPS).default([]),
  publicationKeywords: z.array(chipText).max(MAX_FILTER_CHIPS).default([]),
  productTypes: z.array(z.enum(MATCHING_PRODUCT_TYPES)).default([]),
  productKeywords: z.array(chipText).max(MAX_FILTER_CHIPS).default([]),
  location: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .default(null)
    .transform((value) => value || null), // "" counts as no location
  recentYears: z
    .union([z.literal(1), z.literal(3), z.literal(5)])
    .nullable()
    .default(null),
  careerStages: z.array(z.enum(CAREER_STAGES)).default([]),
});

export type MatchFilters = z.infer<typeof matchFiltersSchema>;
export type MatchFiltersInput = z.input<typeof matchFiltersSchema>;

export function hasActiveFilters(filters: MatchFilters): boolean {
  return (
    filters.skills.length > 0 ||
    filters.expertise.length > 0 ||
    filters.publicationKeywords.length > 0 ||
    filters.productTypes.length > 0 ||
    filters.productKeywords.length > 0 ||
    filters.location !== null ||
    filters.recentYears !== null ||
    filters.careerStages.length > 0
  );
}
