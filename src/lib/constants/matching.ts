import type { ProductType } from "./product";

// Career stage options
export const CAREER_STAGES = [
  "industry",
  "academia",
  "government",
  "ngo",
  "other",
] as const;

export type CareerStage = (typeof CAREER_STAGES)[number];

export const CAREER_STAGE_LABELS: Record<CareerStage, string> = {
  industry: "Industry",
  academia: "Academia",
  government: "Government",
  ngo: "NGO",
  other: "Other",
};

//Labels come from PRODUCT_TYPE_LABELS.
export const MATCHING_PRODUCT_TYPES = [
  "tool",
  "ai_tool",
  "platform",
  "simulation",
  "software",
  "dataset",
  "other",
] as const satisfies readonly ProductType[];

// "Recent publications" dropdown: last N years (null = Any).
export const RECENT_PUBLICATION_YEARS = [1, 3, 5] as const;

export const MAX_FILTER_CHIPS = 20;
export const MAX_FILTER_TEXT_LENGTH = 60;
export const EXPLAINED_RESULTS = 10;
