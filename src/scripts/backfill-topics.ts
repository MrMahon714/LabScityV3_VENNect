import { generateTopicsForUnprocessedPublications } from "@/lib/actions/generate-publication-topics";
import { createScriptClient } from "./script-supabase-client";

async function main() {
  const supabase = createScriptClient();
  let totalProcessed = 0;
  let totalFailed = 0;

  while (true) {
    const { processed, failed } = await generateTopicsForUnprocessedPublications(20, supabase);
    totalProcessed += processed;
    totalFailed += failed;
    if (processed === 0 && failed === 0) break; // nothing left unprocessed
    console.log(`Batch done — processed: ${processed}, failed: ${failed}`);
  }

  console.log(`\nTotal — processed: ${totalProcessed}, failed: ${totalFailed}`);
}

main();