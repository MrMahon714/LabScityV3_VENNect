import { z } from "zod";
import { CAREER_STAGES } from "../constants/matching";
import { MAX_PROFILE_SKILLS, MAX_PROFILE_TAGS } from "../constants/profile";

/**
 * Zod schema for the profile edit form.
 * Validates first/last name, about, workplace, occupation, field of interest,
 * skill (array, max 20), and articles (array of { title, url }, max 30).
 * Used by LSProfileHero edit modal and updateProfileAction.
 */
export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(2, { message: "First name must be at least 2 characters" }),
  lastName: z
    .string()
    .min(2, { message: "Last name must be at least 2 characters" }),
  about: z
    .string()
    .max(256, { message: "About must be at most 256 characters" })
    .optional()
    .or(z.literal("")),
  timezone: z
    .string()
    .refine(
      (value) =>
        !value ||
        Intl.supportedValuesOf("timeZone").includes(value),
        { message : "Invalid timezone" }
    )
    .optional(),
  workplace: z
    .string()
    .min(2, { message: "Workplace must be at least 2 characters" })
    .optional()
    .or(z.literal("")),
  occupation: z
    .string()
    .min(2, { message: "Occupation must be at least 2 characters" })
    .optional()
    .or(z.literal("")),
  labDepartment: z
    .string()
    .min(2, { message: "Lab/department must be at least 2 characters" })
    .max(120, { message: "Lab/department must be at most 120 characters" })
    .optional()
    .or(z.literal("")),
  location: z
    .string()
    .max(120, { message: "Location must be at most 120 characters" })
    .optional()
    .or(z.literal("")),
  careerStage: z
    .union([z.enum(CAREER_STAGES), z.literal("")])
    .nullable()
    .optional(),
});

/** Inferred type from updateProfileSchema. Use for form values and updateProfileAction input. */
export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;

/**
 * Zod schema for follow/unfollow server action input.
 * Validates targetUserId (the user to follow or unfollow).
 */
export const toggleFollowSchema = z.object({
  targetUserId: z.string().min(1, { message: "Target user is required" }),
});

/** Inferred type from toggleFollowSchema. Use for toggleFollowAction input. */
export type ToggleFollowValues = z.infer<typeof toggleFollowSchema>;

/**
 * Zod schema for user report form.
 * Validates report type (impersonation, inappropriate name, inappropriate banner/picture, harassment, etc.)
 * and optional additional context.
 */
export const createUserReportSchema = z.object({
  type: z
    .enum([
      "Impersonation",
      "Inappropriate Name",
      "Inappropriate Profile Picture",
      "Inappropriate Banner",
      "Harassment/Hate",
      "Spam/Scam",
      "Sexual Content",
      "Other",
    ])
    .or(z.literal("")),
  reason: z
    .string()
    .min(1, { message: "Reason is required" })
    .max(2000, { message: "Reason must be less than 2000 characters" }),
}).refine((values) => values.type !== "", {
  message: "Report type is required",
  path: ["type"],
});

/** Inferred type from createUserReportSchema. Use for user report form values. */
export type CreateUserReportValues = z.infer<typeof createUserReportSchema>;


export const skillValueSchema = z.object({
  // null means custom skill
  id: z.number().int().positive().nullable(),
  name: z.string().trim().min(2).max(60)
});

export const updateSkillsSchema = z.object({
  skills: z.array(skillValueSchema).max(MAX_PROFILE_SKILLS, `Up to ${MAX_PROFILE_SKILLS} skills`),
});

export type Skill = z.infer<typeof skillValueSchema>;
export type UpdateSkillsValues = z.infer<typeof updateSkillsSchema>;

export const tagValueSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim()
});

export type Tag = z.infer<typeof tagValueSchema>;

export const declaredTagSchema = z.object({
  // null means custom declared tag
  id: z.number().int().positive().nullable(),
  name: z.string().trim().min(1)
});

export const updateDeclaredTagsSchema = z.object({
  tags: z.array(declaredTagSchema).max(MAX_PROFILE_TAGS, `Up to ${MAX_PROFILE_TAGS} research areas`),
});

export type DeclaredTagValue = z.infer<typeof declaredTagSchema>;
export type UpdateDeclaredTagsValues = z.infer<typeof updateDeclaredTagsSchema>;