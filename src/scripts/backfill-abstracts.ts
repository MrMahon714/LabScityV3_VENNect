// Fills in missing publication abstracts from OpenAlex, using each publication's DOI.
import { createScriptClient } from "./script-supabase-client";

const BATCH_SIZE = 50;
const DELAY_MS = 200;
const DOI_PATTERN = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;

type PublicationRow = { publication_id: number; doi: string | null };
type OpenAlexWork = {
  doi: string | null;
  abstract_inverted_index: Record<string, number[]> | null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeDoi = (doi: string) =>
  doi
    .trim()
    .toLowerCase()
    .replace(/^(https?:\/\/)?(dx\.)?doi\.org\//, "");

function reconstructAbstract(
  index: Record<string, number[]> | null,
): string | null {
  if (!index) return null;
  const positions = Object.values(index).flat();
  if (positions.length === 0) return null;
  const words: string[] = new Array(Math.max(...positions) + 1).fill("");
  for (const [word, wordPositions] of Object.entries(index)) {
    for (const position of wordPositions) words[position] = word;
  }
  return words.join(" ").replace(/\s+/g, " ").trim() || null;
}

async function fetchAbstracts(dois: string[]): Promise<Map<string, string>> {
  const params = new URLSearchParams({
    filter: `doi:${dois.join("|")}`,
    select: "doi,abstract_inverted_index",
    "per-page": String(BATCH_SIZE),
  });
  if (process.env.OPENALEX_MAILTO) {
    params.set("mailto", process.env.OPENALEX_MAILTO);
  }

  const res = await fetch(`https://api.openalex.org/works?${params}`);
  if (!res.ok) throw new Error(`OpenAlex request failed: ${res.status}`);

  const json = (await res.json()) as { results?: OpenAlexWork[] };
  const abstracts = new Map<string, string>();
  for (const work of json.results ?? []) {
    if (!work.doi) continue;
    const abstract = reconstructAbstract(work.abstract_inverted_index);
    if (abstract) abstracts.set(normalizeDoi(work.doi), abstract);
  }
  return abstracts;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const supabase = createScriptClient();

  let lastId = 0;
  let checked = 0;
  let found = 0;
  let saved = 0;
  let notInOpenAlex = 0;
  let skipped = 0;
  let failed = 0;

  if (dryRun) console.log("DRY RUN: nothing will be saved.\n");

  while (true) {
    const { data, error } = await supabase
      .from("publications")
      .select("publication_id, doi")
      .is("abstract", null)
      .not("doi", "is", null)
      .gt("publication_id", lastId)
      .order("publication_id", { ascending: true })
      .limit(BATCH_SIZE);
    if (error) throw error;

    const rows = (data ?? []) as PublicationRow[];
    if (rows.length === 0) break;
    lastId = rows[rows.length - 1].publication_id;

    const valid = rows.filter(
      (row) => row.doi && DOI_PATTERN.test(normalizeDoi(row.doi)),
    );
    skipped += rows.length - valid.length;
    checked += valid.length;

    let abstracts = new Map<string, string>();
    try {
      abstracts = await fetchAbstracts([
        ...new Set(valid.map((row) => normalizeDoi(row.doi as string))),
      ]);
    } catch (err) {
      console.warn(`Batch ending at publication ${lastId} failed:`, err);
      failed += valid.length;
      await sleep(DELAY_MS);
      continue;
    }

    for (const row of valid) {
      const abstract = abstracts.get(normalizeDoi(row.doi as string));
      if (!abstract) {
        notInOpenAlex++;
        continue;
      }
      found++;
      if (dryRun) continue;

      const { error: updateError } = await supabase
        .from("publications")
        .update({ abstract })
        .eq("publication_id", row.publication_id)
        .is("abstract", null);
      if (updateError) {
        failed++;
        console.warn(
          `Could not save publication ${row.publication_id}:`,
          updateError.message,
        );
      } else {
        saved++;
      }
    }

    console.log(
      `...up to publication ${lastId}: ${found} abstracts found so far`,
    );
    await sleep(DELAY_MS);
  }

  console.log("\nDone.");
  console.log(`Publications checked (with a DOI): ${checked}`);
  console.log(`Abstracts found in OpenAlex:       ${found}`);
  console.log(
    dryRun
      ? "Saved:                             0 (dry run)"
      : `Saved:                             ${saved}`,
  );
  console.log(
    `No abstract in OpenAlex:           ${notInOpenAlex} (keep title-only topics)`,
  );
  console.log(`Skipped (unexpected DOI format):   ${skipped}`);
  console.log(`Failed:                            ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
