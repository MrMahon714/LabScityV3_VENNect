import { parsePostContent } from "@/lib/utils/post-content";

/**
 * Heuristically determines whether post/content text looks like it's
 * referencing a published research article (for display-tag purposes only).
 * This is NOT a security check — never use this to decide whether to
 * fetch, embed, or redirect to a URL.
 */

// TODO: consider detecting arXiv IDs, PMIDs, and direct publisher URLs
// (nature.com, sciencedirect.com, etc.) if these show up often in practice.

export function looksLikeArticleContent(content: string | null | undefined): boolean {
  const normalized = (content ?? "").toLowerCase();

  const hasDoiLink = /(^|\/\/|\s)([a-z0-9-]+\.)*doi\.org\/\S+/i.test(normalized);
  const hasDoiPrefix = /\bdoi:\s?\d/i.test(normalized);
  const hasPublishedPhrase = /\bpublished in\b/i.test(normalized);
  const hasJournalPhrase = /\b(in the|a|published in)\s+journal\b/i.test(normalized);
  const hasFullText = /\bfull[\s-]?text\b/i.test(normalized);

  return hasDoiLink || hasDoiPrefix || hasPublishedPhrase || hasJournalPhrase || hasFullText;
}

export function derivePostTags(post: {
  scientificField: string;
  content: string;
  mediaUrl?: string | null;
}) {
  const tags: string[] = [];
  const parsedContent = parsePostContent(post.content);
  const normalizedContent = (post.content ?? "").toLowerCase();
  const normalizedField = (post.scientificField ?? "").trim().toLowerCase();

  const looksLikeArticle = looksLikeArticleContent(
    `${parsedContent.title} ${parsedContent.bodyText}`
  );

  if (looksLikeArticle) tags.push("Article");
  if (post.mediaUrl && normalizedContent.includes("full-text")) tags.push("Full-text available");
  if (looksLikeArticle && normalizedField && normalizedField !== "general" && normalizedField !== "other") {
    tags.push(post.scientificField);
  }

  return tags;
}
