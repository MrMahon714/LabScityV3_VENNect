/*

Seeds real-fake (synthetic) users from public Google Scholar profiles through Scrapingdog
to LabScity to test the matching algorithm.

Each seed user gets:
- an auth account with a fake .edu email (seed-0001@labscity-test.edu),using the shared password SEED_USER_PASSWORD
- users + profile rows (created by the on_auth_user_created trigger),
- Scholar "interests" saved as declared expertise (declared_profile_tags),
- interests that match an existing skills row saved to profile_skills
- Scholar publications saved to publications, linked in user_publications and authors_publications
  (Scholar has no DOIs, so doi is set to "scholar:<citation_id>")

Every created account is recorded in seed-data/seed-manifest.json so we can log in as any of them and delete them all later.

Finding researchers: Scholar's profile search needs a login now, so we search Scholar papers in a field,
take the authors' profile IDs from the results, then follow co-authors until the field has enough users.

Usage (run from the repo root):
- npx tsx src/scripts/seed-scholar-users.ts --fields default --per-field 2 --dry-run
- npx tsx src/scripts/seed-scholar-users.ts --fields default --per-field 10
- npx tsx src/scripts/seed-scholar-users.ts --fields "ecology,robotics" --per-field 5
- npx tsx src/scripts/seed-scholar-users.ts --ids kq0NYnMAAAAJ --limit 10
- npx tsx src/scripts/seed-scholar-users.ts --backfill-publications
- npx tsx src/scripts/seed-scholar-users.ts --backfill-expertise

Flags:
--fields a,b,c      search Scholar for these fields ("default" = DEFAULT_FIELDS)
--per-field <n>     how many new users to create per field (default 10)
--ids a,b,c         start from these Scholar author IDs
--limit <n>         with --ids: how many new users to create, following co-authors (default = number of ids)
--dry-run           fetch from Scholar and print what would be created; writes nothing
--skip-publications    don't import publications
--backfill-publications     import publications for seed users already in the manifest that have none
--backfill-expertise     import expertise for seed users already in the manifest that have none

 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import { createScriptClient } from "./script-supabase-client";

const SEED_EMAIL_DOMAIN = "labscity-test.edu";
const SEED_MARKER = "google_scholar";
const MANIFEST_PATH = path.join(process.cwd(), "seed-data", "seed-manifest.json");
const SCRAPINGDOG_BASE = "https://api.scrapingdog.com/google_scholar";

//Spread across disciplines so the matching test isn't all one field
const DEFAULT_FIELDS = [
  "ecology",
  "neuroscience",
  "machine learning",
  "materials science",
  "epidemiology",
  "civil engineering",
  "economics",
  "social psychology",
  "astronomy",
  "molecular biology",
];

type ManifestEntry = {
  n: number;
  email: string;
  user_id: string;
  scholar_id: string;
  name: string;
  created_at: string;
  expertise_count: number;
  skills_count: number;
  publications_imported: number | null;
  errors: string[];
};

type ScholarInterest = { title?: string };
type ScholarAuthor = {
  name?: string;
  affiliations?: string;
  interests?: ScholarInterest[];
};
type ScholarArticle = {
  title?: string;
  link?: string;
  citation_id?: string;
  authors?: string;
  publication?: string;
  year?: string;
};
type ScholarProfile = {
  author: ScholarAuthor;
  articles: ScholarArticle[];
  coAuthorIds: string[];
};

type Supabase = ReturnType<typeof createScriptClient>;

//helpers

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env.local`);
  return value;
}

function escapeLike(text: string): string {
  return text.replace(/[%_\\]/g, (m) => `\\${m}`);
}

//Format (first_name: "Jane Q.", last_name: "Smith")
function splitName(fullName: string) {
  const cleaned = fullName
    .split(",")[0]
    .replace(/^(dr|prof|professor)\.?\s+/i, "")
    .replace(/[*†‡]/g, "")
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first_name: parts[0] ?? "", last_name: "" };
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts[parts.length - 1],
  };
}

//When there's a comma, the first part is the role; otherwise it's all workplace.
function splitAffiliation(affiliation?: string) {
  if (!affiliation) return { occupation: null, workplace: null };
  const i = affiliation.indexOf(",");
  if (i === -1) return { occupation: null, workplace: affiliation.trim() };
  return {
    occupation: affiliation.slice(0, i).trim() || null,
    workplace: affiliation.slice(i + 1).trim() || null,
  };
}

function loadManifest(): ManifestEntry[] {
  if (!fs.existsSync(MANIFEST_PATH)) return [];
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

function saveManifest(entries: ManifestEntry[]) {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(entries, null, 2)}\n`);
}

//Scrapingdog

//hide api key before printing anything
function redactKey(text: string): string {
  return text.replace(/api_key=[^&"\s]+/g, "api_key=[hidden]");
}

async function scrapingdog(
  endpoint: "search" | "author",
  params: Record<string, string>,
) {
  const url = new URL(
    endpoint === "search" ? SCRAPINGDOG_BASE : `${SCRAPINGDOG_BASE}/${endpoint}`,
  );
  url.searchParams.set("api_key", requireEnv("SCRAPINGDOG_API_KEY"));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url);
  if (!res.ok) {
    //Never print the URL (it contains the API key)
    const body = redactKey((await res.text()).slice(0, 200));
    throw new Error(`Scrapingdog ${endpoint} returned ${res.status}: ${body}`);
  }
  return res.json();
}

//Scholar profile IDs are 12 characters (e.g. kq0NYnMAAAAJ)
const AUTHOR_ID_PATTERN = /(?:user=|"author_id"\s*:\s*")([A-Za-z0-9_-]{12})/g;

//Searches Scholar papers for a field and pulls out the authors' profile IDs (looks anywhere in the response)
async function searchAuthorIds(query: string): Promise<string[]> {
  const data = await scrapingdog("search", { query });
  const text = JSON.stringify(data);
  const ids = [...new Set([...text.matchAll(AUTHOR_ID_PATTERN)].map((m) => m[1]))];

  if (ids.length === 0) {
    console.warn(
      `No author IDs in search for "${query}". Top-level keys: ${Object.keys(data ?? {}).join(", ") || "(none)"}`,
    );
    console.warn(redactKey(JSON.stringify(data, null, 2)).slice(0, 1500));
  }
  return ids;
}

//One call gets the author info, their articles, and their co-authors
async function fetchScholarProfile(scholarId: string): Promise<ScholarProfile> {
  const data = await scrapingdog("author", { author_id: scholarId });
  if (!data.author?.name) {
    throw new Error(`No author data returned for ${scholarId}`);
  }
  const coAuthorIds: string[] = (data.co_authors ?? [])
    .map((c: { author_id?: string }) => c.author_id)
    .filter((id: string | undefined): id is string => Boolean(id));
  return { author: data.author, articles: data.articles ?? [], coAuthorIds };
}

//publications

const DUPLICATE = "23505";

async function getOrCreateAuthorId(supabase: Supabase, userId: string, scholarId: string) {
  const { data: existing, error: findError } = await supabase
    .from("authors")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (findError) throw new Error(`authors lookup: ${findError.message}`);
  if (existing) return existing.id as string;

  const { data: created, error: createError } = await supabase
    .from("authors")
    .insert({ user_id: userId, google_scholar_id: scholarId })
    .select("id")
    .single();
  if (createError) throw new Error(`authors insert: ${createError.message}`);
  return created.id as string;
}

//inserts link rows; if the batch hits a duplicate, retries one by one and skips the duplicates
async function insertLinks(supabase: Supabase, table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const { error } = await supabase.from(table).insert(rows);
  if (!error) return;
  if (error.code !== DUPLICATE) throw new Error(`${table}: ${error.message}`);

  for (const row of rows) {
    const { error: rowError } = await supabase.from(table).insert(row);
    if (rowError && rowError.code !== DUPLICATE) {
      throw new Error(`${table}: ${rowError.message}`);
    }
  }
}

//Returns how many publications are linked to the user
async function importPublications(
  supabase: Supabase,
  userId: string,
  scholarId: string,
  articles: ScholarArticle[],
): Promise<number> {
    const byDoi = new Map<string, Record<string, unknown>>();
  for (const a of articles) {
    const title = a.title?.trim();
    if (!title || !a.citation_id) continue;
    const doi = `scholar:${a.citation_id}`;
    byDoi.set(doi, {
      doi,
      title,
      journal: a.publication?.trim() || null,
      authors: a.authors
        ? a.authors.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      pdf_url: a.link || null,
      date_published: /^\d{4}$/.test(a.year ?? "") ? `${a.year}-01-01` : null,
      type: "other",
    });
  }
  if (byDoi.size === 0) return 0;

  //re-running doesn't create duplicates
  const { data: pubs, error: pubError } = await supabase
    .from("publications")
    .upsert([...byDoi.values()], { onConflict: "doi" })
    .select("publication_id");
  if (pubError) throw new Error(`publications: ${pubError.message}`);
  if (!pubs?.length) return 0;

  const authorId = await getOrCreateAuthorId(supabase, userId, scholarId);

  await insertLinks(
    supabase,
    "user_publications",
    pubs.map((p) => ({ user_id: userId, publication_id: p.publication_id, is_featured: false })),
  );
  await insertLinks(
    supabase,
    "authors_publications",
    pubs.map((p) => ({ author_id: authorId, publication_id: p.publication_id })),
  );

  return pubs.length;
}

async function countUserPublications(supabase: Supabase, userId: string) {
  const { count, error } = await supabase
    .from("user_publications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw new Error(`user_publications count: ${error.message}`);
  return count ?? 0;
}

async function saveInterests(supabase: Supabase, userId: string, interests: string[]) {
  const result = { expertise: 0, skills: 0, errors: [] as string[] };
  const declaredRows: { user_id: string; tag_id: number | null; name: string | null }[] = [];
  const skillRows: { profile_user_id: string; skill_id: number }[] = [];

  for (const interest of interests) {
    const pattern = escapeLike(interest);

    const { data: tag } = await supabase
      .from("tags")
      .select("id")
      .ilike("name", pattern)
      .limit(1)
      .maybeSingle();
    if (tag && declaredRows.some((d) => d.tag_id === tag.id)) continue;
    declaredRows.push(
      tag
        ? { user_id: userId, tag_id: tag.id, name: null }
        : { user_id: userId, tag_id: null, name: interest },
    );

    const { data: skill } = await supabase
      .from("skills")
      .select("id")
      .ilike("name", pattern)
      .limit(1)
      .maybeSingle();
    if (skill && !skillRows.some((s) => s.skill_id === skill.id)) {
      skillRows.push({ profile_user_id: userId, skill_id: skill.id });
    }
  }

  if (declaredRows.length > 0) {
    const { error } = await supabase.from("declared_profile_tags").insert(declaredRows);
    if (error) result.errors.push(`declared_profile_tags: ${error.message}`);
    else result.expertise = declaredRows.length;
  }
  try {
    await insertLinks(supabase, "profile_skills", skillRows);
    result.skills = skillRows.length;
  } catch (err) {
    result.errors.push((err as Error).message);
  }
  return result;
}

//seeding one user
async function seedOne(
  supabase: Supabase,
  scholarId: string,
  manifest: ManifestEntry[],
  options: { dryRun: boolean; skipPublications: boolean },
): Promise<string[]> {
  const { author, articles, coAuthorIds } = await fetchScholarProfile(scholarId);
  const { first_name, last_name } = splitName(author.name ?? "");
  const { occupation, workplace } = splitAffiliation(author.affiliations);
  const interests = (author.interests ?? [])
    .map((i) => i.title?.trim())
    .filter((t): t is string => Boolean(t));

  const n = manifest.reduce((max, e) => Math.max(max, e.n), 0) + 1;
  const email = `seed-${String(n).padStart(4, "0")}@${SEED_EMAIL_DOMAIN}`;

  if (options.dryRun) {
    console.log(
      `[dry run] ${scholarId}  ${first_name} ${last_name}  |  ${workplace ?? "-"}  |  ` +
        `interests: ${interests.join(", ") || "-"}  |  publications=${articles.length} co-authors=${coAuthorIds.length}`,
    );
    return coAuthorIds;
  }

  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password: requireEnv("SEED_USER_PASSWORD"),
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        seeded_from: SEED_MARKER,
        google_scholar_id: scholarId,
      },
    });
  if (createError || !created.user) {
    throw new Error(`createUser failed: ${createError?.message}`);
  }
  const userId = created.user.id;


  const entry: ManifestEntry = {
    n,
    email,
    user_id: userId,
    scholar_id: scholarId,
    name: `${first_name} ${last_name}`.trim(),
    created_at: new Date().toISOString(),
    expertise_count: 0,
    skills_count: 0,
    publications_imported: null,
    errors: [],
  };
  manifest.push(entry);
  saveManifest(manifest);

  const { error: profileError } = await supabase
    .from("profile")
    .update({ occupation, workplace })
    .eq("user_id", userId);
if (profileError) entry.errors.push(`profile: ${profileError.message}`);
  
const saved = await saveInterests(supabase, userId, interests);
  entry.expertise_count = saved.expertise;
  entry.skills_count = saved.skills;
  entry.errors.push(...saved.errors);

  if (!options.skipPublications) {
    try {
      entry.publications_imported = await importPublications(
        supabase,
        userId,
        scholarId,
        articles,
      );
    } catch (err) {
      entry.errors.push(`publications: ${(err as Error).message}`);
    }
  }

  saveManifest(manifest);
  console.log(
    `✓ ${email}  ${entry.name}  expertise=${entry.expertise_count} skills=${entry.skills_count} publications=${entry.publications_imported ?? "-"}` +
      (entry.errors.length ? `\n    errors: ${entry.errors.join(" | ")}` : ""),
  );
  return coAuthorIds;
}

async function backfillPublications(supabase: Supabase, onlyIds: string[] | null) {
  const manifest = loadManifest();
  const targets = onlyIds
    ? manifest.filter((e) => onlyIds.includes(e.scholar_id))
    : manifest;

  for (const entry of targets) {
    try {
      const existing = await countUserPublications(supabase, entry.user_id);
      if (existing > 0) {
        console.log(`- skipping ${entry.email} (already has ${existing} publications)`);
        continue;
      }
      const { articles } = await fetchScholarProfile(entry.scholar_id);
      entry.publications_imported = await importPublications(
        supabase,
        entry.user_id,
        entry.scholar_id,
        articles,
      );
      entry.errors = entry.errors.filter((e) => !e.startsWith("publications:"));
      console.log(`✓ ${entry.email}  ${entry.name}  publications=${entry.publications_imported}`);
    } catch (err) {
      entry.errors.push(`publications: ${(err as Error).message}`);
      console.error(`✗ ${entry.email}: ${(err as Error).message}`);
    }
    saveManifest(manifest);
  }
}

function splitList(value: string) {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

async function backfillExpertise(supabase: Supabase, onlyIds: string[] | null) {
  const manifest = loadManifest();
  const targets = onlyIds
    ? manifest.filter((e) => onlyIds.includes(e.scholar_id))
    : manifest;

  for (const entry of targets) {
    try {
      const { count, error } = await supabase
        .from("declared_profile_tags")
        .select("*", { count: "exact", head: true })
        .eq("user_id", entry.user_id);
      if (error) throw new Error(`declared_profile_tags count: ${error.message}`);
      if ((count ?? 0) > 0) continue;

      const { author } = await fetchScholarProfile(entry.scholar_id);
      const interests = (author.interests ?? [])
        .map((i) => i.title?.trim())
        .filter((t): t is string => Boolean(t));
      if (interests.length === 0) {
        console.log(`- ${entry.email} has no Scholar interests`);
        continue;
      }

      const saved = await saveInterests(supabase, entry.user_id, interests);
      entry.expertise_count = saved.expertise;
      entry.skills_count = saved.skills;
      entry.errors = [
        ...entry.errors.filter((e) => !e.startsWith("declared_profile_tags:") && !e.startsWith("profile_skills:")),
        ...saved.errors,
      ];
      console.log(
        `✓ ${entry.email}  ${entry.name}  expertise=${saved.expertise} skills=${saved.skills}` +
          (saved.errors.length ? `\n    errors: ${saved.errors.join(" | ")}` : ""),
      );
    } catch (err) {
      console.error(`✗ ${entry.email}: ${(err as Error).message}`);
    }
    saveManifest(manifest);
  }
}

type Group = { name: string; target: number; starters: () => Promise<string[]> };

async function main() {
  const dryRun = hasFlag("dry-run");
  const skipPublications = hasFlag("skip-publications");
  const idsArg = getArg("ids");
  const fieldsArg = getArg("fields");
  const perField = Number(getArg("per-field") ?? "10");

  requireEnv("SCRAPINGDOG_API_KEY");

    if (hasFlag("backfill-expertise")) {
        await backfillExpertise(createScriptClient(), idsArg ? splitList(idsArg) : null);
        return;
    }
    
    if (hasFlag("backfill-publications")) {
        await backfillPublications(createScriptClient(), idsArg ? splitList(idsArg) : null);
        return;
    }

  if (!dryRun) requireEnv("SEED_USER_PASSWORD");

  //Each group starts from some Scholar IDs and follows co-authors until it reaches its target
  let groups: Group[];
  if (idsArg) {
    const ids = splitList(idsArg);
    const limit = Number(getArg("limit") ?? String(ids.length));
    groups = [{ name: "ids", target: limit, starters: async () => ids }];
  } else if (fieldsArg) {
    const fields = fieldsArg === "default" ? DEFAULT_FIELDS : splitList(fieldsArg);
    groups = fields.map((field) => ({
      name: field,
      target: perField,
      starters: () => searchAuthorIds(field),
    }));
  } else {
    throw new Error('Pass --fields default (or "a,b,c") [--per-field n], or --ids a,b,c [--limit n]');
  }

  const supabase = createScriptClient();
  const manifest = loadManifest();
  const alreadySeeded = new Set(manifest.map((e) => e.scholar_id));
  const visited = new Set<string>();

  let created = 0;
  let failed = 0;

  for (const group of groups) {
    let starters: string[];
    try {
      starters = await group.starters();
    } catch (err) {
      console.error(`✗ [${group.name}] search failed: ${(err as Error).message}`);
      continue;
    }
    console.log(`\n== ${group.name}: ${starters.length} starting researcher(s), target ${group.target} ==`);

    const queue = [...starters];
    let groupCreated = 0;

    while (queue.length > 0 && groupCreated < group.target) {
      const scholarId = queue.shift() as string;
      if (visited.has(scholarId)) continue;
      visited.add(scholarId);

      if (alreadySeeded.has(scholarId)) {
        if (starters.includes(scholarId)) {
          try {
            const { coAuthorIds } = await fetchScholarProfile(scholarId);
            queue.push(...coAuthorIds);
          } catch {
            //skip
          }
        }
        continue;
      }

      try {
        const coAuthorIds = await seedOne(supabase, scholarId, manifest, {
          dryRun,
          skipPublications,
        });
        queue.push(...coAuthorIds);
        groupCreated++;
        created++;
      } catch (err) {
        failed++;
        console.error(`✗ ${scholarId}: ${(err as Error).message}`);
      }
    }

    if (groupCreated < group.target) {
      console.log(`  [${group.name}] ran out of researchers at ${groupCreated}/${group.target}`);
    }
  }

  console.log(
    dryRun
      ? `\nDry run finished. Would create ${created} user(s). Nothing was written.`
      : `\nDone. Created ${created} this run, ${failed} failed. ${manifest.length} seed user(s) total in ${path.relative(process.cwd(), MANIFEST_PATH)}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});