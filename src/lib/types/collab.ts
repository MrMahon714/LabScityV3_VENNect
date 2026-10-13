// bidirectional = both have offers + "looking for"
// offers_only   = compared what both offer (someone has no "looking for")
// legacy        = older tag/skill embeddings
export type MatchTier = "bidirectional" | "offers_only" | "legacy";

export interface GetCollaboratorsResult {
  cosine_similarity: number;
  profile_user_id: string;
  first_name: string;
  last_name: string;
  profile_pic_path: string | null;
  occupation: string | null;
  workplace: string | null;
  match_tier: MatchTier;
  profile_score: number;
  search_score: number | null;
  they_offer_you_seek: number | null;
  you_offer_they_seek: number | null;
  match_percent: number;
  match_explanation?: string | null;
}

export type RawCollaboratorMatch = Omit<
  GetCollaboratorsResult,
  "match_percent" | "match_explanation"
>;
