// Builds the offers embedding for existing users who don't have one yet.
import {
  buildOffersText,
  generateProfileEmbeddings,
} from "@/lib/actions/generate-embeddings";
import { createScriptClient } from "./script-supabase-client";

const PAGE_SIZE = 100;

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const rebuildAll = process.argv.includes("--all");
  const supabase = createScriptClient();

  let lastId: string | null = null;
  let checked = 0;
  let emptyProfiles = 0;
  let saved = 0;
  let failed = 0;

  console.log(
    rebuildAll
      ? "Mode: rebuilding the offers embedding for EVERY user"
      : "Mode: only users with no offers embedding",
  );
  if (dryRun) console.log("DRY RUN: nothing will be saved.");
  console.log("");

  while (true) {
    let query = supabase
      .from("profile")
      .select("user_id")
      .order("user_id", { ascending: true })
      .limit(PAGE_SIZE);
    if (!rebuildAll) query = query.is("offers_embedding", null);
    if (lastId) query = query.gt("user_id", lastId);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as { user_id: string }[];
    if (rows.length === 0) break;
    lastId = rows[rows.length - 1].user_id;

    for (const { user_id: userId } of rows) {
      checked++;

      const offersText = await buildOffersText(userId, supabase);
      if (!offersText.trim()) {
        emptyProfiles++;
        continue;
      }
      if (dryRun) continue;

      const result = await generateProfileEmbeddings(userId, supabase);
      if (result.success && result.hasOffers) {
        saved++;
        console.log(`  ${checked}. saved ${userId}`);
      } else {
        failed++;
        console.warn(
          `  ${checked}. FAILED ${userId}: ${result.error ?? "Gemini returned no embedding"}`,
        );
      }
    }
  }

  console.log("\nDone.");
  console.log(`Users checked:                ${checked}`);
  console.log(`Empty profiles (skipped):     ${emptyProfiles}`);
  console.log(
    dryRun
      ? `Would be embedded:            ${checked - emptyProfiles}`
      : `Embeddings saved:             ${saved}`,
  );
  console.log(`Failed:                       ${failed}`);
  if (failed > 0) {
    console.log(
      "\nSome users failed. Run the script again; it only retries users still missing an embedding.",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
