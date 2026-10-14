import { z } from "zod";
import { OPENALEX_TYPE_VALUES } from "../constants/openalex";
import { PRODUCT_TYPE_VALUES } from "../constants/product";

export const createPublicationSchema = z.object({
    title: z
        .string()
        .min(1, { 
            message: "Title is required" }),
    doi: z
        .string()
        .optional(),
    journal: z
        .string()
        .optional()
        .nullable(),
    datePublished: z
        .iso.date()
        .optional()
        .nullable(),
    authors: z // making an authors array for now, later creating a table to link authors to current users
       .array(z.string().min(1, { message: "Author name is required" }))
        .min(1, {
            message: "At least one author is required",
       }), // must contain 1 or more items
    publicationType: z
       .enum(OPENALEX_TYPE_VALUES),

    previewPath: z
      .string()
      .optional(),

    isOA: z
      .boolean()
      .optional(),

    pdfUrl: z
      .string()
      .optional()
      .nullable(),
});

export const doiSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/^(https?:\/\/)?(dx\.)?doi\.org\//i, ''))
  .pipe(
    z.string().regex(
      /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i, 
      "Invalid DOI Format"
    )  
  );

export const parsedOpenAlexWorkSchema = z.object({
  title: z
      .string()
      .min(1),
  doi: z
      .string(),
  journal: z
      .string()
      .nullable(),
  publicationDate: z
      .iso.date()
      .nullable(),
  authors:  z
      .array(z.string().min(1))
      .min(1),
  type: z
      .enum(OPENALEX_TYPE_VALUES),
  isOA: z
      .boolean(),
  pdfUrl: z
      .string()
      .nullable(),
  abstract: z.string().nullable(),
  openAlexTopicIds: z
      .array(z.string())
      .nullable()
})

const publicationTagSchema = z.object({
  id: z.number().int().positive().nullable(),
  name: z.string().trim().min(1),
});

export const updatePublicationSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }).max(500),
  type: z.enum(OPENALEX_TYPE_VALUES),
  journal: z.string().trim().max(300).nullable().optional(),
  date_published: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").nullable().optional(),
  authors: z.array(z.string().trim().min(1)).optional(),
  is_oa: z.boolean().optional(),
  pdf_url: z.url().nullable().optional(),
  tags: z.array(publicationTagSchema).max(5).optional(),
});

export const parsedProductWorkSchema = z.object({
  workId: z.string().min(1),
  title: z.string().min(1),
  doi: z.string().nullable(),
  journal: z.string().nullable(),
  publicationDate: z.iso.date().nullable(),
  authors: z.array(z.string().min(1)).min(1),
  type: z.enum(PRODUCT_TYPE_VALUES),
  isOA: z.boolean(),
  pdfUrl: z.string().nullable(),
  openAlexTopicIds: z.array(z.string()).nullable(),
});

export const orcidSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/^(https?:\/\/(www\.)?)?orcid\.org\//i, '').toUpperCase())
  .pipe(
    z.string().regex(
      /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/,
      "Invalid ORCID iD Format"
    )
  );

export const doiFormSchema = z.object({ doi: doiSchema });

export type DoiFormValues = z.infer<typeof doiFormSchema>;
export type CreatePublicationValues = z.infer<typeof createPublicationSchema>;
export type UpdatePublicationValues = z.infer<typeof updatePublicationSchema>;