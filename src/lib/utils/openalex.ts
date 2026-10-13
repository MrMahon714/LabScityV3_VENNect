import { OPENALEX_TYPE_MAP } from "../constants/openalex";
import { OPENALEX_TYPE_DESIGNATIONS as OPENALEX_TYPE_DESIGNATIONS, OpenAlexTypeDesignation, OpenAlexWorkType } from "../types/openalex";
import { OpenAlexWork, ParsedOpenAlexWork } from "../types/publication";
import { doiSchema } from "../validations/publication";

function safeCodePoint(codePoint: number): string {
  if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) 
    return '';
  try { 
    return String.fromCodePoint(codePoint); 
  } catch {
    return '';
  }
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
};

function decodeEntities(s: string, maxPasses: number = 3): string {
  let prev = s;
  for(let i = 0; i < maxPasses; i++) {
    const next =
      s
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
        .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
    if (next === prev) break;
    prev = next;
  }
  return prev;
}

const JATS_TAG =
  /<\/?(?:i|b|em|strong|u|s|sub|sup|sc|scp|inf|tt|mml:[a-z]+|jats:[a-z]+)(?:\s[^>]*)?\/?>/gi;

const SMALL_CAPS_LEADING_LETTER =
  /<(?:sc|scp)>\s*([A-Za-z])\s*<\/(?:sc|scp)>\s*([a-z])/g;

export function sanitizeTitle(title: string | null): string {
  if(!title) return '';
  title = decodeEntities(title);
  title = title.replace(SMALL_CAPS_LEADING_LETTER, '$1$2');
  title = title.replace(JATS_TAG, '');
  return title
    .replace(/([([{])\s+/g, "$1")
    .replace(/\s+([)\]}])/g, "$1")
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveOpenAlexTypeDesignation(raw: string): OpenAlexTypeDesignation {
  const typeDesignation = OPENALEX_TYPE_MAP[raw] ?? 'publication';
  return OPENALEX_TYPE_DESIGNATIONS[typeDesignation];
}

// Reconstruct abstract for topics generation with Google Gemini
export function reconstructAbstract(
  invertedIndex: Record<string, number[]> | null
): string | null {
  if (!invertedIndex) return null;

  const maxPosition = Math.max(
    ...Object.values(invertedIndex).flat()
  );
  const words = new Array(maxPosition + 1).fill('');

  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words[pos] = word;
    }
  }

  return words.join(' ').trim() || null;
}

export function parseOpenAlexWork(work: OpenAlexWork): ParsedOpenAlexWork {
  const type = OPENALEX_TYPE_MAP[work.type ?? ''] ?? 'other';

  const pdfUrl = 
    work.best_oa_location?.pdf_url ??
    work.primary_location?.pdf_url ??
    work.locations?.find((loc) => loc.pdf_url)?.pdf_url ??
    null;

  return {
    workId: work.id,
    doi: work.doi ? (doiSchema.safeParse(work.doi).data ?? null) : null,
    title: sanitizeTitle(work.title),
    authors: work.authorships.map((a) => a.author.display_name),
    type,
    journal: work.primary_location?.source?.display_name ?? null,
    publicationDate: work.publication_date,
    isOA: work.open_access?.is_oa ?? false,
    pdfUrl: pdfUrl,
    abstract: reconstructAbstract(work.abstract_inverted_index),
    openAlexTopicIds: (work.topics ?? []).map((t) =>
      t.id.replace("https://openalex.org/", "")
    ),
  }
}