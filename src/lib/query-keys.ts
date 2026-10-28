import type { FeedFilterValues } from "@/lib/validations/post";
import { PubFilters } from "./types/publication";
import { ProductFilters } from "./types/products";
import { JobFilters } from "./types/jobs";

/**
 * Query key factory for the feed.
 * Use the same keys for server prefetch and client useQuery so hydration matches.
 */
export const feedKeys = {
  all: ["feed"] as const,
  list: (filter: FeedFilterValues) =>
    [...feedKeys.all, "list", filter] as const,
};

export const profileKeys = {
  all: ["profile"] as const,
  user: (user_id: string) => [...profileKeys.all, "user", user_id] as const,
  followers: (user_id: string) =>
    [...profileKeys.all, "followers", user_id] as const,
  friends: (user_id: string) =>
    [...profileKeys.all, "friends", user_id] as const,
  following: (user_id: string) =>
    [...profileKeys.all, "following", user_id] as const,
  posts: (user_id: string) => [...profileKeys.all, "posts", user_id] as const,
  /** Public + private (own profile only) groups visible to the current viewer. */
  groups: (user_id: string) => [...profileKeys.all, "groups", user_id] as const,
};

export const chatKeys = {
  all: ["chat"] as const,
  oldMessages: (conversation_id: number, cursor?: string) =>
    [...chatKeys.all, "oldMessages", conversation_id, cursor] as const,
  chatsWithPreview: () => [...chatKeys.all, "chatsWithPreview"] as const,
  conversationParticipants: (conversation_id: number) =>
    [...chatKeys.all, "conversationParticipants", conversation_id] as const,
};

export const notificationKeys = {
  all: ["notifications"] as const,
  isMuted: (itemId: number, itemType: string) =>
    [...notificationKeys.all, "isMuted", itemId, itemType] as const,
};

export const postKeys = {
  all: ["post"] as const,
  detail: (post_id: string) => [...postKeys.all, "detail", post_id] as const,
};

export const groupKeys = {
  all: ["groups"] as const,
  list: () => [...groupKeys.all, "list"] as const,
  detail: (groupId: number) => [...groupKeys.all, "detail", groupId] as const,
  feed: (groupId: number, filter: FeedFilterValues) =>
    [...groupKeys.all, "feed", groupId, filter] as const,
  discover: (query: string, topicTagsKey: string, limit: number) =>
    [...groupKeys.all, "discover", query, topicTagsKey, limit] as const,
  /** Active public groups for home / discovery highlights (by `last_activity_at`). */
  popular: (limit: number) => [...groupKeys.all, "popular", limit] as const,
  activity: (groupIdsKey: string, lastSeenKey: string) =>
    [...groupKeys.all, "activity", groupIdsKey, lastSeenKey] as const,
};

export const publicationKeys = {
  all: ["publications"] as const,
  lists: () => [...publicationKeys.all, 'list'] as const,
  list: (userId: string, filters?: PubFilters) =>
    [...publicationKeys.lists(), userId, filters ?? {}] as const,
  facets: (userId: string) => [...publicationKeys.all, 'facets', userId] as const
}

export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (userId: string, filters?: ProductFilters) => 
    [...productKeys.lists(), userId, filters ?? {}] as const,
  facets: (userId: string) => [...productKeys.all, 'facets', userId] as const
}

export const tagKeys = {
  all: ["tags"] as const,
  search: (q: string) => [...tagKeys.all, 'search', q] as const,
}

export const bookmarkKeys = {
  all: ["bookmarks"] as const,
  list: (userId: string) => [...bookmarkKeys.all, userId],
  counts: (userId: string) => [...bookmarkKeys.all, "counts", userId],
}

export const jobKeys = {
  all: ["jobs"] as const,
  lists: () => [...jobKeys.all, "list"] as const,
  list: (filters: JobFilters) => [...jobKeys.lists(), filters] as const,
  mine: () => [...jobKeys.all, "mine"] as const,
  trending: () => [...jobKeys.all, "trending"] as const,
  recommended: (filters: JobFilters) => [...jobKeys.all, "recommended", filters] as const,
  details: () => [...jobKeys.all, "detail"] as const,
  detail: (id: number) => [...jobKeys.details(), id] as const,
  // TODO: Think about using this for some sort of dedicated saved jobs page or card
  saved: () => [...jobKeys.all, "saved"] as const,
};
