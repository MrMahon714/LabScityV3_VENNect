import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import {
	createPost,
	deletePost,
	createComment,
	deleteComment,
	createReport,
	likePost,
	likeComment,
} from "../feed";
import type { CreatePostValues, CreateCommentValues, CreateReportValues } from "../../validations/post";

async function testFeedActions() {
	console.log("Starting feed actions integration tests...\n");

	// Check if environment variables are set
	if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
		console.error("❌ Error: Missing environment variables!");
		console.error("Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set.");
		return;
	}

	if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
		console.error("❌ Error: Missing test user credentials!");
		console.error("Please add TEST_USER_EMAIL and TEST_USER_PASSWORD to your .env file.");
		return;
	}

	// Create Supabase client with anon key (for authenticated user operations)
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	);

	// Sign in with test user
	console.log("=== Authenticating Test User ===");
	const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
		email: process.env.TEST_USER_EMAIL,
		password: process.env.TEST_USER_PASSWORD,
	});

	if (authError || !authData.user) {
		console.error("❌ Failed to authenticate test user:", authError?.message);
		console.error("Please ensure the test user exists and credentials are correct.");
		return;
	}

	console.log(`✅ Authenticated as: ${authData.user.email} (ID: ${authData.user.id})\n`);

	let testPostId: string;
	let testCommentId: string = "";

	// Test 1: Create Post
	console.log("=== Test 1: Create Post ===");
	const postData: CreatePostValues = {
		scientificField: "Computer Science",
		content: "This is a test post for integration testing",
		category: "formal",
	};

	const createPostResult = await createPost(postData, supabase);
	console.log("Create Post Result:", createPostResult);

	if (createPostResult.success && createPostResult.data) {
		testPostId = createPostResult.data.id.toString();
		console.log(`✅ Post created successfully with ID: ${testPostId}\n`);
	} else {
		console.log("❌ Failed to create post\n");
		return;
	}

	// Test 2: Like Post
	console.log("=== Test 2: Like Post ===");
	const likePostResult = await likePost(testPostId, supabase);
	console.log("Like Post Result:", likePostResult);
	if (likePostResult.success) {
		console.log(`✅ Post liked: ${likePostResult.data?.isLiked}\n`);
	} else {
		console.log("❌ Failed to like post\n");
	}

	// Test 3: Unlike Post (toggle)
	console.log("=== Test 3: Unlike Post (toggle) ===");
	const unlikePostResult = await likePost(testPostId, supabase);
	console.log("Unlike Post Result:", unlikePostResult);
	if (unlikePostResult.success) {
		console.log(`✅ Post unliked: ${!unlikePostResult.data?.isLiked}\n`);
	} else {
		console.log("❌ Failed to unlike post\n");
	}

	// Test 4: Create Comment
	console.log("=== Test 4: Create Comment ===");
	const commentData: CreateCommentValues = {
		content: "This is a test comment on the post",
	};

	const createCommentResult = await createComment(testPostId, commentData, supabase);
	console.log("Create Comment Result:", createCommentResult);

	if (createCommentResult.success && createCommentResult.data) {
		testCommentId = createCommentResult.data.id.toString();
		console.log(`✅ Comment created successfully with ID: ${testCommentId}\n`);
	} else {
		console.log("❌ Failed to create comment\n");
	}

	// Test 5: Like Comment
	if (testCommentId) {
		console.log("=== Test 5: Like Comment ===");
		const likeCommentResult = await likeComment(testCommentId, supabase);
		console.log("Like Comment Result:", likeCommentResult);
		if (likeCommentResult.success) {
			console.log(`✅ Comment liked: ${likeCommentResult.data?.isLiked}\n`);
		} else {
			console.log("❌ Failed to like comment\n");
		}

		// Test 6: Unlike Comment (toggle)
		console.log("=== Test 6: Unlike Comment (toggle) ===");
		const unlikeCommentResult = await likeComment(testCommentId, supabase);
		console.log("Unlike Comment Result:", unlikeCommentResult);
		if (unlikeCommentResult.success) {
			console.log(`✅ Comment unliked: ${!unlikeCommentResult.data?.isLiked}\n`);
		} else {
			console.log("❌ Failed to unlike comment\n");
		}
	}

	// Test 7: Create Report for Post
	console.log("=== Test 7: Create Report for Post ===");
	const postReportData: CreateReportValues = {
		type: "Spam/Scam",
		reason: "This is a test report for the post",
	};

	const createPostReportResult = await createReport(
		testPostId,
		null,
		postReportData,
		supabase,
	);
	console.log("Create Post Report Result:", createPostReportResult);
	if (createPostReportResult.success) {
		console.log("✅ Post report created successfully\n");
	} else {
		console.log("❌ Failed to create post report\n");
	}

	// Test 8: Create Report for Comment
	if (testCommentId) {
		console.log("=== Test 8: Create Report for Comment ===");
		const commentReportData: CreateReportValues = {
			type: "Harassment/Hate",
			reason: "This is a test report for the comment",
		};

		const createCommentReportResult = await createReport(
			testPostId,
			testCommentId,
			commentReportData,
			supabase,
		);
		console.log("Create Comment Report Result:", createCommentReportResult);
		if (createCommentReportResult.success) {
			console.log("✅ Comment report created successfully\n");
		} else {
			console.log("❌ Failed to create comment report\n");
		}
	}

	// Test 9: Delete Comment
	if (testCommentId) {
		console.log("=== Test 9: Delete Comment ===");
		const deleteCommentResult = await deleteComment(testCommentId, supabase);
		console.log("Delete Comment Result:", deleteCommentResult);
		if (deleteCommentResult.success) {
			console.log("✅ Comment deleted successfully\n");
		} else {
			console.log("❌ Failed to delete comment\n");
		}
	}

	// Test 10: Delete Post
	console.log("=== Test 10: Delete Post ===");
	const deletePostResult = await deletePost(testPostId, supabase);
	console.log("Delete Post Result:", deletePostResult);
	if (deletePostResult.success) {
		console.log("✅ Post deleted successfully\n");
	} else {
		console.log("❌ Failed to delete post\n");
	}

	console.log("=== All tests completed ===");
}

if (require.main === module) {
	testFeedActions();
}
