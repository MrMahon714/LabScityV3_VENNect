export const JOB_TYPE_OPTIONS = [
  { value: "postdoc", label: "Postdoc" },
  { value: "faculty", label: "Faculty" },
  { value: "phd", label: "PhD" },
  { value: "grad_student", label: "Grad Student" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "internship", label: "Internship" },
  { value: "contract", label: "Contract" },
] as const;

export const WORK_MODE_OPTIONS = [
  { value: "on-site", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
] as const;

export function formatJobTypeLabel(value: string | null | undefined) {
  return (
    JOB_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
    "General"
  );
}

export function formatWorkModeLabel(value: string | null | undefined) {
  return (
    WORK_MODE_OPTIONS.find((option) => option.value === value)?.label ??
    "On-site"
  );
}

export function getPlainTextFromHtml(value: string | null | undefined) {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function getJobPreviewText(
  summary: string | null | undefined,
  description: string | null | undefined,
) {
  return summary?.trim() || getPlainTextFromHtml(description);
}
