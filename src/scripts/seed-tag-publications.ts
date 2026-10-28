/*

Fills ai_topics for the real fake users' publications.
One Gemini call per publication, paced by GEMINI_RATE_LIMIT_RPM (default 15/min)

Usage (run from the repo root):
- npx tsx src/scripts/seed-tag-publications.ts --users 1
- npx tsx src/scripts/seed-tag-publications.ts
- npx tsx src/scripts/seed-tag-publications.ts --per-user 10

*/

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import { createScriptClient } from "./script-supabase-client";

const MANIFEST_PATH = path.join(process.cwd(), "seed-data", "seed-manifest.json");
const MAX_FAILS_IN_A_ROW = 10;
const REQUESTS_PER_MINUTE = Number(process.env.GEMINI_RATE_LIMIT_RPM ?? 15);
const DELAY_MS = Math.ceil(60000 / REQUESTS_PER_MINUTE);

type ManifestEntry = { email: string; user_id: string; name: string };
type Pub = {
  publication_id: number;
  title: string;
  abstract: string | null;
  doi: string;
  date_published: string | null;
  ai_topics: string[] | null;
};

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY in .env.local");

  const { extractTopicsFromAbstract } = await import("@/lib/actions/topic-extraction");
  const { generateProfileEmbeddings } = await import("@/lib/actions/generate-embeddings");

  const perUser = Number(getArg("per-user") ?? "5");
  const maxUsers = Number(getArg("users") ?? "Infinity");
  const skipEmbeddings = process.argv.includes("--skip-embeddings");

  const supabase = createScriptClient();
  const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const users = manifest.slice(0, maxUsers);

  let tagged = 0;
  let failed = 0;
  let failsInARow = 0;

  for (const user of users) {
    const { data: rows, error } = await supabase
      .from("user_publications")
      .select("publications(publication_id, title, abstract, doi, date_published, ai_topics)")
      .eq("user_id", user.user_id);
    if (error) {
      console.error(`✗ ${user.email}: ${error.message}`);
      continue;
    }

    const pubs = (rows ?? [])
      .map((r) => r.publications as unknown as Pub | null)
      .filter((p): p is Pub => Boolean(p?.doi?.startsWith("scholar:")))
      .sort((a, b) => (b.date_published ?? "").localeCompare(a.date_published ?? ""))
      .slice(0, perUser);
    const untagged = pubs.filter((p) => !p.ai_topics);

    if (untagged.length === 0) {
      console.log(`- ${user.email}  ${user.name}  (already tagged)`);
      continue;
    }

    let userTagged = 0;
    for (const pub of untagged) {
      const topics: string[] = await extractTopicsFromAbstract(pub.abstract, pub.title);

      if (topics.length === 0) {
        failed++;
        failsInARow++;
        if (failsInARow >= MAX_FAILS_IN_A_ROW) {
          console.error(
            `\nStopping: Gemini returned no topics ${MAX_FAILS_IN_A_ROW} times in a row ` +
              "(check GEMINI_API_KEY, quota, or whether titles alone are enough).",
          );
          console.log(`Tagged ${tagged}, failed ${failed}. Re-run to continue where it stopped.`);
          return;
        }
      } else {
        const { error: updateError } = await supabase
          .from("publications")
          .update({ ai_topics: topics })
          .eq("publication_id", pub.publication_id);
        if (updateError) {
          failed++;
          console.error(`  ✗ publication ${pub.publication_id}: ${updateError.message}`);
        } else {
          tagged++;
          userTagged++;
          failsInARow = 0;
        }
      }
      await sleep(DELAY_MS);
    }

    let embeddingNote = "";
    if (!skipEmbeddings && userTagged > 0) {
      const result = await generateProfileEmbeddings(user.user_id, supabase);
      embeddingNote = result.success
        ? result.hasOffers ? "  embedding ✓" : "  embedding empty"
        : `  embedding ✗ ${result.error}`;
    }
    console.log(`✓ ${user.email}  ${user.name}  tagged ${userTagged}/${untagged.length}${embeddingNote}`);
  }

  console.log(`\nDone. Tagged ${tagged} publication(s), ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
