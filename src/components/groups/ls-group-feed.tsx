"use client";

import { Divider, Stack, Text } from "@mantine/core";
import { useRouter } from "next/navigation";
import { LSCommentComposer } from "@/components/feed/ls-comment-composer";
import { LSPostCard } from "@/components/feed/ls-post-card";
import { LSPostCommentCard } from "@/components/feed/ls-post-comment-card";
import { LSPostComposer } from "@/components/feed/ls-post-composer";
import type { LSGroupFeedProps } from "@/components/groups/ls-group-layout.types";
import { useGroupFeed } from "@/components/groups/use-group-feed";
import { ReportOverlay } from "@/components/report/report-overlay";
import { CreatePostCard, FeedPostCard } from "../feed/home-feed";
import { useAuth } from "../auth/use-auth";
import { useUserProfile } from "../profile/use-profile";
import { usePostActions } from "@/lib/actions/use-post-actions";
import { useSetSavedPost } from "../feed/use-feed";
import { useState } from "react";
import { FeedPostItem } from "@/lib/types/feed";
import { PostFollowButton } from "../feed/post-follow-button";
import { groupKeys } from "@/lib/query-keys";

/**
 * Group-scoped feed: identical UI to HomeFeed but backed by useGroupFeed,
 * which filters posts to the active group and bakes groupId into mutations.
 */
export function LSGroupFeed(props: LSGroupFeedProps) {
  const router = useRouter();
  const {
    posts,
    isFeedLoading,
    isFeedError,
    feedError,
    reportTarget,
    setReportTarget,
    activeCommentPostId,
    setActiveCommentPostId,
    isComposerOpen,
    setIsComposerOpen,
    createPostMutation,
    createCommentMutation,
    handleSubmitPost,
    onSubmitReport,
    handleAddComment,
    handleTogglePostLike,
    handleToggleCommentLike,
    handleEditPost,
    updatePostMutation,
    currentUserId,
  } = useGroupFeed(props);

  const profile = useUserProfile(currentUserId ?? '').data;
  const currentUserName = profile ? `${profile?.first_name} ${profile?.last_name}` : 'Current User'
  
  

  return (
    <Stack gap="lg" maw='700' mx='auto'>
      <ReportOverlay
        open={reportTarget !== null}
        title={reportTarget?.type === "post" ? "Report post" : "Report comment"}
        preview={
          reportTarget?.type === "post"
            ? posts
                .filter((post) => post.id === reportTarget.postId)
                .map((post) => (
                  <LSPostCard
                    key={post.id}
                    userId={post.userId}
                    userName={post.userName}
                    avatarUrl={post.avatarUrl ?? null}
                    field={post.scientificField}
                    timeAgo={post.timeAgo}
                    content={post.content}
                    mediaUrl={post.mediaUrl ?? null}
                    mediaLabel={post.mediaLabel ?? null}
                    isLiked={post.isLiked ?? false}
                    showMenu={false}
                    showActions={false}
                  />
                ))
            : posts
                .filter((post) => post.id === reportTarget?.postId)
                .flatMap((post) => post.comments)
                .filter((comment) => comment.id === reportTarget?.commentId)
                .map((comment) => (
                  <LSPostCommentCard
                    key={comment.id}
                    comment={comment}
                    showMenu={false}
                    showActions={false}
                  />
                ))
        }
        onClose={() => setReportTarget(null)}
        onSubmit={onSubmitReport}
      />

      <CreatePostCard
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        isComposerOpen={isComposerOpen}
        onToggleComposer={() => setIsComposerOpen(!isComposerOpen)}
        onSubmit={handleSubmitPost}
        isPending={createPostMutation.isPending}
        type='group'
      />

      {isFeedLoading ? (
        <Text size="sm" c="dimmed">
          Loading posts...
        </Text>
      ) : isFeedError ? (
        <Text size="sm" c="red">
          {feedError instanceof Error
            ? feedError.message
            : "Failed to load group posts"}
        </Text>
      ) : null}

      <Stack gap="lg" w="100%">
        {posts.map((post) => (
          <GroupFeedPostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
          />
        ))}
      </Stack>
    </Stack>
  );
}

// TODO: The actions in this card don't update the correct caches for the group feed, so things like liking
//  saving, commenting, etc. will not propagate to the group feed until refresh.  
function GroupFeedPostCard({
  post,
  currentUserId,
}: {
  post: FeedPostItem;
  currentUserId: string | null;
}) {
  const actions = usePostActions(post.id, {
    extraInvalidateKeys: [[...groupKeys.all, "feed"]],
  });
  const setSavedPost = useSetSavedPost(currentUserId ?? '');

  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  );

  return (
    <FeedPostCard 
      post={post}
      currentUserId={currentUserId}
      commentOpen={activeCommentPostId === post.id}
      onToggleComments={() => setActiveCommentPostId((c) => (c === post.id ? null : post.id))}
      onAddComment={async (postId, values) => await actions.addComment(values)}
      onLike={() => actions.toggleLike()}
      onDelete={() => actions.remove()}
      onSetSaved={(postId, save) => setSavedPost.mutate({ postId, save })} 
    />
  )
}
