import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_SEARCH_HISTORY } from "@/lib/constants/matching";
import type { MatchFilters } from "@/lib/validations/matching";

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    return `{${entries
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Saves a search to the user's history. Skips it if it's identical to their
 * latest search, and keeps only the newest MAX_SEARCH_HISTORY.
 */
export async function saveSearchToHistory(
  supabase: SupabaseClient,
  userId: string,
  filters: MatchFilters,
): Promise<void> {
  try {
    const { data: latest } = await supabase
      .from("match_searches")
      .select("filters")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      latest &&
      stableStringify(latest.filters) === stableStringify(filters)
    ) {
      return;
    }

    const { error } = await supabase
      .from("match_searches")
      .insert({ user_id: userId, filters });
    if (error) {
      console.warn("Failed to save search history:", error.message);
      return;
    }

    const { data: older } = await supabase
      .from("match_searches")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(MAX_SEARCH_HISTORY, MAX_SEARCH_HISTORY + 100);

    if (older?.length) {
      await supabase
        .from("match_searches")
        .delete()
        .in(
          "id",
          older.map((row: { id: number }) => row.id),
        );
    }
  } catch (err) {
    console.warn("Search history failed:", err);
  }
}
