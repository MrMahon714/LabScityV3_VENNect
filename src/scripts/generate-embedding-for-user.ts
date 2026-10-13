import { generateProfileEmbeddings } from "@/lib/actions/generate-embeddings";
import { createScriptClient } from "./script-supabase-client";

async function main() {
  const supabase = createScriptClient();
  const jordanId = "72795500-0000-4000-8000-000000000001";

  const result = await generateProfileEmbeddings(jordanId, supabase);
  console.log("Result:", result);
}

main();