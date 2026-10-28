export { derivePostTags as derivePostTagsFromDetail } from "@/lib/utils/article-detection";

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
