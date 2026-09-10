import { ProductType } from "../constants/product";
import { Publication } from "./data";
import { OpenAlexWorkType } from "./openalex";

// done so that 
export type PublicationType = OpenAlexWorkType;

export interface OpenAlexWork {
  id: string;
  title: string | null;
  doi: string | null;
  best_oa_location: { pdf_url: string | null };
  primary_location: { source: { display_name: string } | null, pdf_url: string | null } | null;
  publication_date: string | null;
  authorships: {author: { display_name: string }}[];
  type: string | null;
  open_access: { is_oa: boolean, oa_url: string | null } | null;
  locations: { pdf_url: string | null }[];
  topics: {id: string; display_name: string; score: number}[];
  abstract_inverted_index: Record<string, number[]> | null;
}

export interface ParsedOpenAlexWork<
  WorkType extends PublicationType | ProductType = PublicationType
> {
  workId: string;
  title: string;
  doi: string | null; 
  journal: string | null;
  publicationDate: string | null;
  authors: string[];
  type: WorkType;
  isOA: boolean;
  pdfUrl: string | null;
  openAlexTopicIds: string[];
  abstract: string | null;
}

export type InfinitePublications = {
  publications: Publication[],
  nextCursor: {
    date_published: string | null
    publication_id: number
  } | null
}

export interface PublicationFacets {
  years: { year: number, count: number }[],
  types: { type: PublicationType, count: number }[]
  tags: { id: number, name: string, count: number }[]
  count: number
}

export interface PubFilters {
  search: string;
  year: string | null;
  tagId: string | null;
  type: string | null;
  sort: 'newest' | 'oldest';
}