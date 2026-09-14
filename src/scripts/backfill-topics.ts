import { generateTopicsForUnprocessedPublications } from "@/lib/actions/generate-publication-topics";
import { generateProfileEmbeddings } from "@/lib/actions/generate-embeddings";
import { createScriptClient } from "./script-supabase-client";

async function main() {
  const supabase = createScriptClient();
  let totalProcessed = 0;
  let totalFailed = 0;
  const affectedUserIds = new Set<string>();

  while (true) {
    const { data: beforeBatch } = await supabase
      .from("publications")
      .select("publication_id")
      .is("ai_topics", null)
      .limit(20);

    const idsBefore = new Set((beforeBatch ?? []).map((p) => p.publication_id));

    const { processed, failed } = await generateTopicsForUnprocessedPublications(20, supabase);
    totalProcessed += processed;
    totalFailed += failed;
    if (processed === 0 && failed === 0) break;

    if (idsBefore.size > 0) {
      const { data: owners } = await supabase
        .from("user_publications")
        .select("user_id")
        .in("publication_id", [...idsBefore]);
      (owners ?? []).forEach((o: any) => affectedUserIds.add(o.user_id));
    }

    console.log(`Batch done — processed: ${processed}, failed: ${failed}`);
  }

  console.log(`\nTotal — processed: ${totalProcessed}, failed: ${totalFailed}`);

  console.log(`\nRegenerating embeddings for ${affectedUserIds.size} affected user(s)...`);
  for (const userId of affectedUserIds) {
    await generateProfileEmbeddings(userId, supabase);
    console.log(`  Embeddings regenerated for ${userId}`);
  }
}

main();