// floor   = 5th percentile  -> shows as 0%
// ceiling = 95th percentile -> shows as 100%
import { createScriptClient } from "./script-supabase-client";

const TIERS = ["bidirectional", "offers_only", "legacy"] as const;
const MIN_PAIRS = 30;

type Row = { cosine_similarity: number | null; match_tier: string };

function percentile(sorted: number[], p: number): number {
  const index = (sorted.length - 1) * p;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low);
}

async function main() {
  const supabase = createScriptClient();

  const { data: profiles, error } = await supabase
    .from("profile")
    .select("user_id");
  if (error) throw error;

  const scores = new Map<string, number[]>();

  for (const { user_id } of profiles ?? []) {
    const { data, error: rpcError } = await supabase.rpc(
      "get_collaborators_filtered",
      { current_user_id: user_id },
    );
    if (rpcError) {
      console.warn(`Skipped ${user_id}: ${rpcError.message}`);
      continue;
    }
    for (const row of (data ?? []) as Row[]) {
      if (row.cosine_similarity === null) continue;
      const list = scores.get(row.match_tier) ?? [];
      list.push(row.cosine_similarity);
      scores.set(row.match_tier, list);
    }
  }

  console.log(`Users checked: ${profiles?.length ?? 0}\n`);

  for (const tier of TIERS) {
    const list = (scores.get(tier) ?? []).sort((a, b) => a - b);
    if (list.length === 0) {
      console.log(`${tier}: no pairs`);
      continue;
    }
    const floor = percentile(list, 0.05);
    const ceiling = percentile(list, 0.95);
    const warning =
      list.length < MIN_PAIRS
        ? `  <- only ${list.length} pairs, too few to trust; keep the current values`
        : "";
    console.log(
      `${tier}: ${list.length} pairs, min ${list[0].toFixed(3)}, max ${list[list.length - 1].toFixed(3)}` +
        ` -> suggested { floor: ${floor.toFixed(2)}, ceiling: ${ceiling.toFixed(2)} }${warning}`,
    );
  }
}

main();
