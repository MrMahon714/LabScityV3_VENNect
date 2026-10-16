// Dev tool: how many researchers actually have public ORCID keywords?
// Usage: pnpm tsx src/scripts/check-orcid-keyword-coverage.ts <orcid> [<orcid> ...]
// Accepts bare iDs or full https://orcid.org/... URLs. Prints the keywords found per iD.

import { fetchOrcidKeywords } from "@/lib/utils/orcid-keywords";
import { orcidSchema } from "@/lib/validations/publication";

async function main() {
  const inputs = process.argv.slice(2);
  if (inputs.length === 0) {
    console.error(
      "Usage: pnpm tsx src/scripts/check-orcid-keyword-coverage.ts <orcid> [<orcid> ...]",
    );
    process.exit(1);
  }

  let withKeywords = 0;
  let checked = 0;

  for (const input of inputs) {
    const parsed = orcidSchema.safeParse(input);
    if (!parsed.success) {
      console.log(`${input}: invalid ORCID iD, skipped`);
      continue;
    }
    const keywords = await fetchOrcidKeywords(parsed.data);
    checked++;
    if (keywords.length > 0) withKeywords++;
    console.log(
      `${parsed.data}: ${keywords.length} keyword(s)${keywords.length ? ` -> ${keywords.join(" | ")}` : ""}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 150)); // be polite to the public API
  }

  console.log(`\n${withKeywords}/${checked} iDs have public keywords`);
}

main();
