import { doiSchema, type CreatePublicationValues } from "@/lib/validations/publication";
import { OPENALEX_TYPE_MAP, OPENALEX_WORK_TYPE_LABELS } from "@/lib/constants/openalex";
import type { OpenAlexWorkType } from "@/lib/types/openalex";
import type { ParsedOpenAlexWork } from "@/lib/types/publication";

export type ExtractedGrant = {
  title: string;
  grantingAgency: string;
  program?: string;
  yearsAwarded?: string;
  role?: string;
  collaborators?: string[];
};

export type ExtractedPublication = {
  title: string;
  publicationType?: string;
  authors?: string[];
  journalOrVenue?: string;
  publicationDate?: string;
  doi?: string;
  topics?: string[];
};

export type ExtractedData = {
  researchAreas: string[];
  skills: string[];
  grants: ExtractedGrant[];
  publications: ExtractedPublication[];
};

export type ExtractResumeResponse = {
  success: boolean;
  fileName: string;
  extractedData: ExtractedData;
};

//Fills in missing arrays
export function normalizeExtractedData(raw: Partial<ExtractedData> | null | undefined): ExtractedData {
  return {
    researchAreas: raw?.researchAreas ?? [],
    skills: raw?.skills ?? [],
    grants: raw?.grants ?? [],
    publications: raw?.publications ?? [],
  };
}

// Skill/research-area UI cleaning

export function cleanNameList(
  names: string[],
  { min = 2, max = 60, maxCount }: { min?: number; max?: number; maxCount?: number } = {},
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (name.length < min || name.length > max) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return maxCount !== undefined ? result.slice(0, maxCount) : result;
}

export type NamedItem = { id: number | null; name: string };


export function mergeWithExisting(
  existing: NamedItem[],
  extracted: string[],
  { min = 2, max = 60, maxCount }: { min?: number; max?: number; maxCount: number },
): { items: NamedItem[]; added: number; leftOut: number } {
  const have = new Set(existing.map((e) => e.name.trim().toLowerCase()));
  const candidates = cleanNameList(extracted, { min, max }).filter(
    (name) => !have.has(name.toLowerCase()),
  );
  const room = Math.max(0, maxCount - existing.length);
  const toAdd = candidates.slice(0, room);
  return {
    items: [...existing, ...toAdd.map((name) => ({ id: null, name }))],
    added: toAdd.length,
    leftOut: candidates.length - toAdd.length,
  };
}

export function normalizeDoi(doi: string | null | undefined): string | null {
  if (!doi) return null;
  const parsed = doiSchema.safeParse(doi);
  return parsed.success ? parsed.data : null;
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

export function toIsoDate(text: string | null | undefined): string | null {
  if (!text) return null;
  const s = text.trim();

  const full = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (full) return s;

  const yearMonth = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yearMonth) return `${yearMonth[1]}-${yearMonth[2].padStart(2, "0")}-01`;

  const monthYear = s.match(/^([A-Za-z]{3})[A-Za-z]*\.?,?\s+(\d{4})$/);
  if (monthYear) {
    const month = MONTHS[monthYear[1].toLowerCase()];
    if (month) return `${monthYear[2]}-${month}-01`;
  }

  const yearOnly = s.match(/\b(19|20)\d{2}\b/);
  if (yearOnly) return `${yearOnly[0]}-01-01`;

  return null;
}

const LABEL_TO_TYPE: Record<string, OpenAlexWorkType> = Object.fromEntries(
  Object.entries(OPENALEX_WORK_TYPE_LABELS).map(([type, label]) => [
    label.toLowerCase(),
    type as OpenAlexWorkType,
  ]),
);

export function toPublicationType(text: string | null | undefined): OpenAlexWorkType {
  if (!text) return "other";
  const key = text.trim().toLowerCase();
  return (
    LABEL_TO_TYPE[key] ??
    OPENALEX_TYPE_MAP[key] ??
    OPENALEX_TYPE_MAP[key.replace(/\s+/g, "-")] ??
    "other"
  );
}

export function publicationProblem(pub: ExtractedPublication): string | null {
  if (!pub.title?.trim()) return "Title is missing";
  if (!pub.authors?.some((a) => a.trim())) return "At least one author is needed";
  return null;
}

export function hasValidDoi(pub: ExtractedPublication): boolean {
  return normalizeDoi(pub.doi) !== null;
}

export function toCreatePublicationValues(pub: ExtractedPublication): CreatePublicationValues | null {
  if (publicationProblem(pub) || hasValidDoi(pub)) return null;
  return {
    title: pub.title.trim(),
    journal: pub.journalOrVenue?.trim() || null,
    datePublished: toIsoDate(pub.publicationDate),
    authors: pub.authors!.map((a) => a.trim()).filter(Boolean),
    publicationType: toPublicationType(pub.publicationType),
    isOA: false,
    pdfUrl: null,
  };
}

export function toParsedWork(pub: ExtractedPublication): ParsedOpenAlexWork | null {
  if (publicationProblem(pub) || !hasValidDoi(pub)) return null;
  const doi = normalizeDoi(pub.doi)!;
  return {
    workId: doi,
    title: pub.title.trim(),
    doi,
    journal: pub.journalOrVenue?.trim() || null,
    publicationDate: toIsoDate(pub.publicationDate),
    authors: pub.authors!.map((a) => a.trim()).filter(Boolean),
    type: toPublicationType(pub.publicationType),
    isOA: false,
    pdfUrl: null,
    openAlexTopicIds: [],
    abstract: null,
  };
}

export function toParsedWorks(pubs: ExtractedPublication[]): ParsedOpenAlexWork[] {
  const seen = new Set<string>();
  const result: ParsedOpenAlexWork[] = [];
  for (const pub of pubs) {
    const work = toParsedWork(pub);
    if (!work || seen.has(work.doi!)) continue;
    seen.add(work.doi!);
    result.push(work);
  }
  return result;
}