/**
 * Type definitions for the feed feature
 * Based on Supabase database schema
 */

import type { CareerStage } from "../constants/matching";
import { DeclaredTagValue, Skill } from "../validations/profile";

export type PostCategory = "formal" | "natural" | "social" | "applied" | "general";

export interface User {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_pic_path?: string | null;
  profile_header_path?: string | null;
  avatar_url?: string | null;
  about?: string | null;
  occupation?: string | null;
  workplace?: string | null;
  skills?: Skill[];
  declared_tags?: DeclaredTagValue[];
  profile_header_url?: string | null;
  timezone?: string | null;
  lab_department?: string | null;
  location?: string | null;
  career_stage?: CareerStage | null;
}

/**
 * Post type from the posts table
 */
export interface Post {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  category: PostCategory;
  link: string | null;
  created_at: string;
}

// TODO: Replace instances of the Post type with FeedPost instead

/**
 * Comment type from the comments table
 */
export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
}

/**
 * Like type from the likes table
 */
export interface Like {
  id: string;
  user_id: string;
  post_id: string;
}

/**
 * Extended Post type with related data (user, comments, likes)
 * Used for feed display
 */
export interface PostWithRelations extends Post {
  user: User;
  comments: Comment[];
  likes: Like[];
  comment_count: number;
  like_count: number;
  is_liked: boolean;
}

/**
 * Local feed display type used by the home feed UI
 */
export interface FeedPostItem {
  id: string;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  scientificField: string;
  content: string;
  timeAgo: string;
  mediaUrl?: string | null;
  mediaHeight?: number;
  mediaWidth?: number;
  mediaLabel?: string | null;
  comments: FeedCommentItem[];
  isLiked?: boolean;
  likeCount?: number;
  audienceLabel?: string | null;
  isSaved?: boolean;
}

export interface FeedCommentItem {
  id: string;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  content: string;
  createdAt?: string;
  timeAgo: string;
  isLiked?: boolean;
  parentCommentId?: string | null;
}

/**
 * Shape returned by getFeed server action on success.
 * Used for TanStack Query so the client expects posts as FeedPostItem[].
 */
export interface GetFeedResult {
  posts: FeedPostItem[];
  nextCursor: string | null;
}

export interface GetFeedPaginatedResult {
  pages: GetFeedResult[];
  pageParams: (string | undefined)[];
}

export interface GetPostDetailResult {
  success: boolean;
  data: FeedPostItem;
}
