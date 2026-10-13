import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CAREER_STAGE_LABELS,
  type CareerStage,
} from "@/lib/constants/matching";
import { PRODUCT_TYPE_LABELS, type ProductType } from "@/lib/constants/product";
import type { GetCollaboratorsResult, MatchTier } from "@/lib/types/collab";
import type { MatchFilters } from "@/lib/validations/matching";

//Facts about why one person matched, taken from the matching algorithm.

export interface MatchEvidence {
  id: string;
  matchType: MatchTier;
  scores: {
    overall: number;
    profileMatch: number;
    theyOfferWhatYouSeek: number | null;
    youOfferWhatTheySeek: number | null;
    searchFit: number | null;
  };
  sharedSkills: string[];
  sharedResearchAreas: string[];
  searchTermsFound: { term: string; foundIn: string[] }[];
  filtersPassed: string[];
  theirTopics: string[];
}

type NameRow = { user_id: string; name: string | null };
type PublicationRow = {
  user_id: string;
  publications: {
    ai_topics: string[] | null;
    date_published: string | null;
  } | null;
};
type ProfileRow = {
  user_id: string;
  location: string | null;
  career_stage: string | null;
  orcid_keywords: string[] | null;
};
type ProductRow = { user_id: string; product_type: string };

const round = (value: number | null) =>
  value === null ? null : Math.round(value * 100) / 100;

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

/** Loose text match: same term, or one contains the other (4+ characters). */
function relates(a: string, b: string): boolean {
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  if (!x || !y) return false;
  return (
    x === y ||
    (x.length >= 4 && y.includes(x)) ||
    (y.length >= 4 && x.includes(y))
  );
}

function namesByUser(rows: NameRow[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.name) continue;
    const list = map.get(row.user_id) ?? [];
    list.push(row.name);
    map.set(row.user_id, list);
  }
  return map;
}

function shared(mine: string[], theirs: string[]): string[] {
  const own = new Set(mine.map((name) => name.toLowerCase()));
  return [...new Set(theirs.filter((name) => own.has(name.toLowerCase())))];
}

function mainTopics(publications: PublicationRow[], max: number): string[] {
  const counts = new Map<string, number>();
  for (const row of publications) {
    for (const topic of row.publications?.ai_topics ?? []) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([topic]) => topic);
}

export async function buildMatchEvidence(
  supabase: SupabaseClient,
  currentUserId: string,
  results: GetCollaboratorsResult[],
  filters: MatchFilters,
): Promise<MatchEvidence[]> {
  if (results.length === 0) return [];

  const candidateIds = results.map((result) => result.profile_user_id);
  const everyone = [currentUserId, ...candidateIds];

  const [skillsRes, areasRes, publicationsRes, profilesRes, productsRes] =
    await Promise.all([
      supabase
        .from("profile_skills_view")
        .select("user_id, name")
        .in("user_id", everyone),
      supabase
        .from("profile_declared_tags_view")
        .select("user_id, name")
        .in("user_id", everyone),
      supabase
        .from("user_publications")
        .select("user_id, publications(ai_topics, date_published)")
        .in("user_id", candidateIds),
      supabase
        .from("profile")
        .select("user_id, location, career_stage, orcid_keywords")
        .in("user_id", candidateIds),
      filters.productTypes.length
        ? supabase
            .from("user_products_full")
            .select("user_id, product_type")
            .in("user_id", candidateIds)
            .in("product_type", filters.productTypes)
        : Promise.resolve({ data: [], error: null }),
    ]);

  for (const res of [
    skillsRes,
    areasRes,
    publicationsRes,
    profilesRes,
    productsRes,
  ]) {
    if (res.error) {
      console.warn("Match evidence query failed:", res.error.message);
    }
  }

  const skills = namesByUser((skillsRes.data ?? []) as unknown as NameRow[]);
  const areas = namesByUser((areasRes.data ?? []) as unknown as NameRow[]);
  const publications = (publicationsRes.data ??
    []) as unknown as PublicationRow[];
  const profiles = new Map(
    ((profilesRes.data ?? []) as unknown as ProfileRow[]).map((row) => [
      row.user_id,
      row,
    ]),
  );
  const products = (productsRes.data ?? []) as unknown as ProductRow[];

  const mySkills = skills.get(currentUserId) ?? [];
  const myAreas = areas.get(currentUserId) ?? [];

  const searchTerms = [
    ...new Set([
      ...filters.skills.map((chip) => chip.name),
      ...filters.expertise.map((chip) => chip.name),
      ...filters.publicationKeywords,
      ...filters.productKeywords,
    ]),
  ];

  const years = filters.recentYears;
  let cutoff: string | null = null;
  if (years !== null) {
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    cutoff = date.toISOString().slice(0, 10);
  }

  return results.map((result) => {
    const id = result.profile_user_id;
    const theirSkills = skills.get(id) ?? [];
    const theirAreas = areas.get(id) ?? [];
    const theirPublications = publications.filter((row) => row.user_id === id);
    const profile = profiles.get(id);
    const orcidKeywords = profile?.orcid_keywords ?? [];

    const searchTermsFound = searchTerms.flatMap((term) => {
      const foundIn: string[] = [];
      if (theirSkills.some((skill) => relates(term, skill))) {
        foundIn.push("skills");
      }
      if (theirAreas.some((area) => relates(term, area))) {
        foundIn.push("research areas");
      }
      const publicationCount = theirPublications.filter((row) =>
        (row.publications?.ai_topics ?? []).some((topic) =>
          relates(term, topic),
        ),
      ).length;
      if (publicationCount > 0) {
        foundIn.push(plural(publicationCount, "publication"));
      }
      if (orcidKeywords.some((keyword) => relates(term, keyword))) {
        foundIn.push("ORCID keywords");
      }
      return foundIn.length ? [{ term, foundIn }] : [];
    });

    const filtersPassed: string[] = [];
    if (filters.location && profile?.location?.trim()) {
      filtersPassed.push(`Location: ${profile.location}`);
    }
    if (filters.careerStages.length && profile?.career_stage) {
      const label =
        CAREER_STAGE_LABELS[profile.career_stage as CareerStage] ??
        profile.career_stage;
      filtersPassed.push(`Career stage: ${label}`);
    }
    if (years !== null && cutoff !== null) {
      const recentCount = theirPublications.filter(
        (row) => (row.publications?.date_published ?? "") >= cutoff,
      ).length;
      filtersPassed.push(
        `${plural(recentCount, "publication")} in the last ${plural(years, "year")}`,
      );
    }
    if (filters.productTypes.length) {
      const theirProducts = products.filter((row) => row.user_id === id);
      if (theirProducts.length) {
        const labels = [
          ...new Set(
            theirProducts.map(
              (row) =>
                PRODUCT_TYPE_LABELS[row.product_type as ProductType] ??
                row.product_type,
            ),
          ),
        ];
        filtersPassed.push(
          `${plural(theirProducts.length, "product")}: ${labels.join(", ")}`,
        );
      }
    }

    return {
      id,
      matchType: result.match_tier,
      scores: {
        overall: round(result.cosine_similarity) ?? 0,
        profileMatch: round(result.profile_score) ?? 0,
        theyOfferWhatYouSeek: round(result.they_offer_you_seek),
        youOfferWhatTheySeek: round(result.you_offer_they_seek),
        searchFit: round(result.search_score),
      },
      sharedSkills: shared(mySkills, theirSkills),
      sharedResearchAreas: shared(myAreas, theirAreas),
      searchTermsFound,
      filtersPassed,
      theirTopics: mainTopics(theirPublications, 6),
    };
  });
}

export function templateExplanation(evidence: MatchEvidence): string {
  const parts: string[] = [];

  if (evidence.searchTermsFound.length) {
    const terms = evidence.searchTermsFound
      .slice(0, 3)
      .map((found) => found.term);
    parts.push(`Matches your search: ${terms.join(", ")}`);
  }
  if (evidence.sharedSkills.length) {
    parts.push(
      `Shared skills: ${evidence.sharedSkills.slice(0, 3).join(", ")}`,
    );
  }
  if (evidence.sharedResearchAreas.length) {
    parts.push(
      `Shared research areas: ${evidence.sharedResearchAreas.slice(0, 2).join(", ")}`,
    );
  }
  if (!parts.length && evidence.theirTopics.length) {
    parts.push(`Works on ${evidence.theirTopics.slice(0, 2).join(" and ")}`);
  }
  if (!parts.length) {
    parts.push(
      evidence.matchType === "bidirectional"
        ? "What they offer fits what you're looking for"
        : "Similar research profile",
    );
  }

  return `${parts.join(" · ")}.`;
}
