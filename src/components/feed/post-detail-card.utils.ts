import { looksLikeArticleContent } from "@/lib/utils/article-detection";
import { parsePostContent} from "@/lib/utils/post-content";

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function derivePostTagsFromDetail(post: {
  scientificField: string;
  content: string;
  mediaUrl?: string | null;
}) {
  const tags: string[] = [];
  const parsedContent = parsePostContent(post.content);
  const normalizedContent = post.content.toLowerCase();
  const normalizedField = post.scientificField.trim().toLowerCase();

  const looksLikeArticle = looksLikeArticleContent(
    `${parsedContent.title} ${parsedContent.bodyText}`
  );
  
  if (looksLikeArticle) {
    tags.push("Article");
  }

  if (post.mediaUrl && normalizedContent.includes("full-text")) {
    tags.push("Full-text available");
  }

  if (
    looksLikeArticle &&
    normalizedField &&
    normalizedField !== "general" &&
    normalizedField !== "other"
  ) {
    tags.push(post.scientificField);
  }

  return tags;
}
