import { type NextRequest, NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/actions/generate-embeddings";
import { EXPLAINED_RESULTS } from "@/lib/constants/matching";
import type { RawCollaboratorMatch } from "@/lib/types/collab";
import { explainMatches } from "@/lib/utils/match-explanation";
import { buildFilterSearchText } from "@/lib/utils/match-filters";
import { rankByMatchPercent } from "@/lib/utils/match-percent";
import { saveSearchToHistory } from "@/lib/utils/search-history";
import {
  hasActiveFilters,
  matchFiltersSchema,
} from "@/lib/validations/matching";
import { createClient } from "@/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Always the logged-in user
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profile")
    .select("seeks_embedding")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data, error } = await supabase.rpc("get_collaborators_filtered", {
    current_user_id: user.id,
    filter_embedding: profile?.seeks_embedding ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    rankByMatchPercent((data ?? []) as RawCollaboratorMatch[]),
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // An empty body is allowed and means "no filters"
  const raw = await request.text();
  let body: unknown = {};
  if (raw.trim()) {
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 },
      );
    }
  }

  const parsed = matchFiltersSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: issue
          ? `${issue.path.join(".")}: ${issue.message}`
          : "Invalid filters",
      },
      { status: 400 },
    );
  }
  const filters = parsed.data;

  // Soft filters: skills, expertise and keywords
  const searchText = buildFilterSearchText(filters);
  let filterEmbedding: number[] | null = null;
  if (searchText) {
    filterEmbedding = await generateEmbedding(searchText, "RETRIEVAL_QUERY");
    if (!filterEmbedding) {
      console.warn("Filter embedding failed; ranking without it");
    } else {
      // Remember the latest search as the user's seeks vector, so the sidebar can use it
      const { error: seeksError } = await supabase
        .from("profile")
        .update({ seeks_embedding: filterEmbedding })
        .eq("user_id", user.id);
      if (seeksError) {
        console.warn("Failed to save last search:", seeksError.message);
      }
    }
  }

  // Hard filters: product types, recent years, location and career stage - SQL function.
  const { data, error } = await supabase.rpc("get_collaborators_filtered", {
    current_user_id: user.id,
    filter_embedding: filterEmbedding,
    product_types: filters.productTypes.length ? filters.productTypes : null,
    recent_years: filters.recentYears,
    location_query: filters.location,
    career_stages: filters.careerStages.length ? filters.careerStages : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (hasActiveFilters(filters)) {
    await saveSearchToHistory(supabase, user.id, filters);
  }

  const results = rankByMatchPercent(
    (data ?? []) as RawCollaboratorMatch[],
  ).slice(0, EXPLAINED_RESULTS);

  const explanations = await explainMatches(
    supabase,
    user.id,
    results,
    filters,
  );

  return NextResponse.json(
    results.map((result) => ({
      ...result,
      match_explanation: explanations.get(result.profile_user_id) ?? null,
    })),
  );
}
