  import { vi } from "vitest";
import type {
	FeedCommentItem,
	FeedPostItem,
	GetFeedResult,
} from "@/lib/types/feed";
import {
	makeFeed,
	makeFeedComment,
	makeFeedPost,
} from "@/tests/fixtures/feed";
import type {
	CreateCommentValues,
	CreatePostValues,
	CreateReportValues,
	FeedFilterValues,
} from "@/lib/validations/post";

interface InMemoryFeedStore {
	posts: FeedPostItem[];
}

/**
 * Shared in-memory feed store used by mocked server actions.
 *
 * Tests can reset or replace this store to create isolated scenarios for
 * loading, success, error, and edge-case paths without touching Supabase.
 */
export const feedStore: InMemoryFeedStore = {
	posts: makeFeed(2, 1),
};

/**
 * Resets the in-memory feed store to a known state.
 *
 * Call this in tests that need to ensure isolation between scenarios.
 */
export function resetFeedStore(posts?: FeedPostItem[]): void {
	if (posts) {
		feedStore.posts = [...posts];
		return;
	}

	feedStore.posts = makeFeed(2, 1);
}

/**
 * Mock implementation of getFeed server action.
 *
 * Returns a successful result with the current in-memory feed; individual
 * tests can override behavior via mockImplementationOnce for error cases.
 */
export const getFeedMock = vi.fn(
	async (
		_input: FeedFilterValues,
	): Promise<{ success: true; data: GetFeedResult }> => ({
		success: true,
		data: {
			posts: feedStore.posts,
			nextCursor: null,
		},
	}),
);

/**
 * Mock implementation of createPost server action.
 *
 * Appends a new post to the in-memory feed based on CreatePostValues.
 */
export const createPostMock = vi.fn(
	async (
		input: CreatePostValues,
	): Promise<{ success: boolean; error?: string }> => {
		const newPost: FeedPostItem = makeFeedPost({
			scientificField: input.scientificField,
			content: input.content,
			comments: [],
		});

		feedStore.posts = [newPost, ...feedStore.posts];

		return { success: true };
	},
);

/**
 * Mock implementation of createComment server action.
 *
 * Adds a new comment to the specified post in the in-memory feed.
 */
export const createCommentMock = vi.fn(
	async (
		postId: string,
		values: CreateCommentValues,
	): Promise<{ success: boolean; data?: { id: string }; error?: string }> => {
		const post = feedStore.posts.find((candidate) => candidate.id === postId);

		if (!post) {
			return { success: false, error: "Post not found" };
		}

		const comment: FeedCommentItem = makeFeedComment({
			content: values.content,
		});

		post.comments.push(comment);

		return { success: true, data: { id: comment.id } };
	},
);

/**
 * Mock implementation of createReport server action.
 *
 * For now this is a no-op that simply reports success; tests can override
 * the behavior to simulate error paths when needed.
 */
export const createReportMock = vi.fn(
	async (
		_postId: string,
		_commentId: string | null,
		_values: CreateReportValues,
	): Promise<{ success: boolean; error?: string }> => ({
		success: true,
	}),
);

/**
 * Mock implementation of likePost server action.
 *
 * Toggles the isLiked flag on the target post in the in-memory store and
 * returns the updated like state.
 */
export const likePostMock = vi.fn(
	async (
		postId: string,
	): Promise<{ success: boolean; data?: { isLiked: boolean }; error?: string }> => {
		const post = feedStore.posts.find((candidate) => candidate.id === postId);

		if (!post) {
			return { success: false, error: "Post not found" };
		}

		const nextIsLiked = !post.isLiked;
		post.isLiked = nextIsLiked;

		return {
			success: true,
			data: { isLiked: nextIsLiked },
		};
	},
);

/**
 * Mock implementation of likeComment server action.
 *
 * Toggles the isLiked flag on the target comment in the in-memory store.
 */
export const likeCommentMock = vi.fn(
	async (
		postId: string,
		commentId: string,
	): Promise<{ success: boolean; data?: { isLiked: boolean }; error?: string }> => {
		const post = feedStore.posts.find((candidate) => candidate.id === postId);

		if (!post) {
			return { success: false, error: "Post not found" };
		}

		const comment = post.comments.find(
			(candidate) => candidate.id === commentId,
		);

		if (!comment) {
			return { success: false, error: "Comment not found" };
		}

		const nextIsLiked = !comment.isLiked;
		comment.isLiked = nextIsLiked;

		return {
			success: true,
			data: { isLiked: nextIsLiked },
		};
	},
);

/**
 * Module-level mock for "@/lib/actions/feed".
 *
 * Tests that need to override behavior can import the individual mock
 * functions from this module and call mockImplementationOnce / mockReset
 * as needed.
 */
vi.mock("@/lib/actions/feed", () => ({
	getFeed: getFeedMock,
	createPost: createPostMock,
	createComment: createCommentMock,
	createReport: createReportMock,
	likePost: likePostMock,
	likeComment: likeCommentMock,
}));
