"use server";
import { createClient } from "@/supabase/server";
import { extractTopicsFromAbstract } from "./topic-extraction";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

//Configurable pacing
const REQUESTS_PER_MINUTE = Number(process.env.GEMINI_RATE_LIMIT_RPM ?? 15);
const DELAY_MS = Math.ceil(60000 / REQUESTS_PER_MINUTE);

export async function generateTopicsForUnprocessedPublications(
  limit: number = 20,
  supabaseOverride?: ReturnType<typeof createClient> extends Promise<infer T> ? T : never
) {
  const supabase = supabaseOverride ?? await createClient();

  const { data: pubs, error } = await supabase
    .from("publications")
    .select("publication_id, title, abstract")
    .is("ai_topics", null)
    .limit(limit);

  if (error) {
    console.error("Failed to fetch unprocessed publications:", error);
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const pub of pubs ?? []) {
    const topics = await extractTopicsFromAbstract(pub.abstract, pub.title);
    if (topics.length === 0) {
      failed++;
      continue;
    }
    const { error: updateError } = await supabase
      .from("publications")
      .update({ ai_topics: topics })
      .eq("publication_id", pub.publication_id);

    if (updateError) failed++;
    else processed++;

    await sleep(DELAY_MS);
  }

  return { processed, failed };
}