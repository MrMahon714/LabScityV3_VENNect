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
  match_explanation?: string | null;
}
