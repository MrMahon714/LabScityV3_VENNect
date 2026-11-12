"use client";

import { Box, Stack } from "@mantine/core";
import { useMemo, useState } from "react";
import { LSCommentComposer } from "@/components/feed/ls-comment-composer";
import { LSPostCommentCard } from "@/components/feed/ls-post-comment-card";
import type { FeedCommentItem } from "@/lib/types/feed";
import type { CreateCommentValues } from "@/lib/validations/post";

interface CommentThreadNode extends FeedCommentItem {
  replies: CommentThreadNode[];
}

interface PostCommentThreadProps {
  comments: FeedCommentItem[];
  postId: string;
  onAddComment: (
    postId: string,
    values: CreateCommentValues,
  ) => Promise<void> | void;
  onLikeComment: (commentId: string) => void;
  onReportComment: (commentId: string) => void;
  isSubmitting?: boolean;
}

function sortCommentsByCreatedAt(comments: FeedCommentItem[]) {
  return [...comments].sort((left, right) => {
    if (!left.createdAt || !right.createdAt) {
      return left.id.localeCompare(right.id);
    }

    return (
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    );
  });
}

function buildCommentTree(comments: FeedCommentItem[]): CommentThreadNode[] {
  const sortedComments = sortCommentsByCreatedAt(comments);
  const nodes = new Map<string, CommentThreadNode>();
  const roots: CommentThreadNode[] = [];

  for (const comment of sortedComments) {
    nodes.set(comment.id, { ...comment, replies: [] });
  }

  for (const comment of sortedComments) {
    const node = nodes.get(comment.id);
    if (!node) {
      continue;
    }

    if (comment.parentCommentId && nodes.has(comment.parentCommentId)) {
      nodes.get(comment.parentCommentId)?.replies.push(node);
      continue;
    }

    roots.push(node);
  }

  return roots;
}

function CommentThreadItem({
  node,
  depth,
  postId,
  onAddComment,
  onLikeComment,
  onReportComment,
  isSubmitting = false,
}: {
  node: CommentThreadNode;
  depth: number;
  postId: string;
  onAddComment: (
    postId: string,
    values: CreateCommentValues,
  ) => Promise<void> | void;
  onLikeComment: (commentId: string) => void;
  onReportComment: (commentId: string) => void;
  isSubmitting?: boolean;
}) {
  const [isReplying, setIsReplying] = useState(false);

  return (
    <Box>
      <LSPostCommentCard
        comment={node}
        onLikeClick={() => onLikeComment(node.id)}
        onReportClick={() => onReportComment(node.id)}
        onReplyClick={() => setIsReplying((current) => !current)}
        menuId={`comment-menu-${node.id}`}
      />

      {isReplying ? (
        <Box ml={44} mt="sm">
          <LSCommentComposer
            postId={postId}
            onAddComment={async (nextPostId, values) => {
              await onAddComment(nextPostId, {
                ...values,
                parentCommentId: node.id,
              });
              setIsReplying(false);
            }}
            isSubmitting={isSubmitting}
            parentCommentId={node.id}
            placeholder={`Reply to ${node.userName}...`}
            submitLabel="Reply"
            onCancel={() => setIsReplying(false)}
            autoFocus
          />
        </Box>
      ) : null}

      {node.replies.length > 0 ? (
        <Box
          ml={18}
          mt="sm"
          pl={18}
          style={{
            borderLeft: "2px solid var(--ls-border)",
          }}
        >
          <Stack gap="sm">
            {node.replies.map((reply) => (
              <CommentThreadItem
                key={reply.id}
                node={reply}
                depth={depth + 1}
                postId={postId}
                onAddComment={onAddComment}
                onLikeComment={onLikeComment}
                onReportComment={onReportComment}
                isSubmitting={isSubmitting}
              />
            ))}
          </Stack>
        </Box>
      ) : null}
    </Box>
  );
}

export function PostCommentThread({
  comments,
  postId,
  onAddComment,
  onLikeComment,
  onReportComment,
  isSubmitting = false,
}: PostCommentThreadProps) {
  const thread = useMemo(() => buildCommentTree(comments), [comments]);

  return (
    <Stack gap="sm">
      {thread.map((node) => (
        <CommentThreadItem
          key={node.id}
          node={node}
          depth={0}
          postId={postId}
          onAddComment={onAddComment}
          onLikeComment={onLikeComment}
          onReportComment={onReportComment}
          isSubmitting={isSubmitting}
        />
      ))}
    </Stack>
  );
}
