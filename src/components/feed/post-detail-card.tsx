"use client";

import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Menu,
  Modal,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBookmark,
  IconDots,
  IconEdit,
  IconFileText,
  IconHeart,
  IconMessageCircle,
  IconQuote,
  IconShare3,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { PostRichTextContent } from "@/components/feed/post-rich-text-content";
import { PostFollowButton } from "@/components/feed/post-follow-button";
import { derivePostTagsFromDetail, initials } from "@/components/feed/post-detail-card.utils";
import { parsePostContent } from "@/lib/utils/post-content";
import { useSetSavedPost } from "./use-feed";

interface PostDetailCardProps {
  post: {
    id: string;
    userId: string;
    userName: string;
    avatarUrl?: string | null;
    scientificField: string;
    content: string;
    timeAgo: string;
    mediaUrl?: string | null;
    mediaWidth?: number;
    mediaHeight?: number;
    comments: Array<{ id: string }>;
    isLiked?: boolean;
    likeCount?: number;
    isSaved?: boolean;
  };
  currentUserId: string | null;
  onLike: () => void;
  onOpenComments?: () => void;
  onReportClick?: () => void;
  onDeleteClick?: () => void;
  onEditSubmit?: (values: { content: string }) => Promise<void> | void;
  isEditPending?: boolean;
  children?: React.ReactNode;
}

export function PostDetailCard({
  post,
  currentUserId,
  onLike,
  onOpenComments,
  onReportClick,
  onDeleteClick,
  onEditSubmit,
  isEditPending = false,
  children,
}: PostDetailCardProps) {
  const isOwnPost = currentUserId != null && currentUserId === post.userId;
  const [copied, setCopied] = useState(false);
  const [confirmDeleteOpen, confirmDeleteHandlers] = useDisclosure(false);
  const [editOpen, editHandlers] = useDisclosure(false);
  const parsedContent = parsePostContent(post.content);
  const title = parsedContent.title;
  const inferredTags =
    parsedContent.tags.length > 0
      ? parsedContent.tags
      : derivePostTagsFromDetail({
          scientificField: post.scientificField,
          content: parsedContent.bodyText,
          mediaUrl: post.mediaUrl,
        });
  const isFeatured = parsedContent.isFeatured;
  const isCitable =
    parsedContent.kind === "publication" || inferredTags.includes("Article");
  const canEdit = Boolean(onEditSubmit) && !parsedContent.isStructured;
  const [draftContent, setDraftContent] = useState(parsedContent.bodyText);

  useEffect(() => {
    if (!editOpen) {
      setDraftContent(parsedContent.bodyText);
    }
  }, [editOpen, parsedContent.bodyText]);

  const handleEditSubmit = async () => {
    const nextContent = draftContent.trim();
    if (!nextContent) {
      notifications.show({
        title: "Could not update post",
        message: "Content is required",
        color: "red",
      });
      return;
    }

    try {
      await onEditSubmit?.({ content: nextContent });
      editHandlers.close();
    } catch {
      // Parent mutation handles notifications.
    }
  };
  const setSaved = useSetSavedPost(currentUserId ?? '');

  return (
    <>
      <Modal
        opened={confirmDeleteOpen}
        onClose={confirmDeleteHandlers.close}
        title="Delete post"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete this post? This action cannot be
            undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={confirmDeleteHandlers.close}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => {
                confirmDeleteHandlers.close();
                onDeleteClick?.();
              }}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={editOpen} onClose={editHandlers.close} title="Edit post" centered>
        <Stack gap="md">
          <Textarea
            label="Post"
            minRows={5}
            value={draftContent}
            onChange={(event) => setDraftContent(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={editHandlers.close}
              disabled={isEditPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleEditSubmit()}
              loading={isEditPending}
              disabled={
                draftContent.trim().length === 0 ||
                draftContent.trim() === parsedContent.bodyText.trim()
              }
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Card
        radius="xl"
        withBorder
        bg="var(--ls-surface)"
        p={{ base: "md", sm: "lg" }}
        style={{
          borderColor: "var(--ls-border)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        <Stack gap="md">
          {isFeatured ? (
            <Box
              h={8}
              mx={{ base: -16, sm: -24 }}
              mt={{ base: -16, sm: -24 }}
              style={{
                background:
                  "linear-gradient(90deg, #1F3A5F 0%, #2A65C7 55%, #67C7C0 100%)",
              }}
            />
          ) : null}

          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Group gap="xs" wrap="wrap">
              {isFeatured ? (
                <Badge
                  radius="xl"
                  variant="light"
                  leftSection={<IconStarFilled size={10} color="#A16207" />}
                  style={{
                    background: "#FEF3C7",
                    color: "#92400E",
                    border: "1px solid #FCD34D",
                  }}
                >
                  Featured
                </Badge>
              ) : null}
              {isOwnPost ? (
                <Badge
                  radius="xl"
                  variant="light"
                  style={{
                    background: "var(--ls-tint-bg-2)",
                    color: "var(--ls-tint-text)",
                    border: "1px solid var(--ls-tint-border)",
                  }}
                >
                  Your Post
                </Badge>
              ) : null}
              {inferredTags.map((tag) => (
                <Badge
                  key={tag}
                  radius="xl"
                  variant="light"
                  leftSection={
                    tag === "Article" ? <IconFileText size={10} /> : undefined
                  }
                  style={{
                    background: tag === "Article" ? "var(--ls-tint-bg)" : "var(--ls-tint-bg-2)",
                    color: "var(--ls-tint-text)",
                    border: "1px solid var(--ls-tint-border)",
                  }}
                >
                  {tag}
                </Badge>
              ))}
            </Group>

            {(onReportClick || canEdit || onDeleteClick) ? (
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray" aria-label="Post actions">
                    <IconDots size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  {canEdit ? (
                    <Menu.Item
                      leftSection={<IconEdit size={14} />}
                      onClick={editHandlers.open}
                    >
                      Edit post
                    </Menu.Item>
                  ) : null}
                  {onDeleteClick ? (
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={14} />}
                      onClick={confirmDeleteHandlers.open}
                    >
                      Delete post
                    </Menu.Item>
                  ) : null}
                  {onReportClick ? (
                    <Menu.Item onClick={onReportClick}>Report</Menu.Item>
                  ) : null}
                </Menu.Dropdown>
              </Menu>
            ) : null}
          </Group>

          <Stack gap={8}>
            <Text
              fw={700}
              fz={{ base: 22, sm: 28 }}
              c="var(--ls-text-strong)"
              style={{
                lineHeight: 1.25,
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              {title}
            </Text>
            {parsedContent.bodyHtml ? (
              <Box c="var(--ls-text-body)">
                <PostRichTextContent html={parsedContent.bodyHtml} />
              </Box>
            ) : (
              <Text
                size="md"
                c="var(--ls-text-body)"
                lh={1.7}
                style={{
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                {parsedContent.bodyText}
              </Text>
            )}
          </Stack>

          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
              <Avatar size={44} radius="xl" src={post.avatarUrl ?? undefined} color="blue">
                {initials(post.userName)}
              </Avatar>
              <Box style={{ minWidth: 0 }}>
                <Group gap="xs" wrap="wrap">
                  <Text
                    component={Link}
                    href={`/profile/${post.userId}`}
                    size="sm"
                    fw={700}
                    c="var(--ls-text-strong)"
                    style={{ textDecoration: "none" }}
                  >
                    {post.userName}
                  </Text>
                  <Text size="sm" c="var(--ls-text-muted)">
                    {post.timeAgo}
                  </Text>
                </Group>
                <Text size="sm" c="var(--ls-text-muted)" style={{ overflowWrap: "anywhere" }}>
                  {post.scientificField}
                </Text>
              </Box>
              {!isOwnPost ? (
                <PostFollowButton
                  currentUserId={currentUserId}
                  targetUserId={post.userId}
                />
              ) : null}
            </Group>
            <Text size="sm" c="var(--ls-tint-text)">
              {copied ? "Link copied" : ""}
            </Text>
          </Group>

          {post.mediaUrl ? (
            <Box
              style={{
                overflow: "hidden",
                borderRadius: 18,
                border: "1px solid var(--ls-border)",
                aspectRatio: "16 / 9",
                position: "relative",
                background: "var(--ls-border)",
              }}
            >
              <Image
                src={post.mediaUrl}
                alt="Post attachment"
                fill
                style={{ objectFit: "cover", display: "block" }}
              />
            </Box>
          ) : null}

          <Divider color="var(--ls-border)" />

          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <Group gap="lg">
              <Button
                variant="subtle"
                color={post.isLiked ? "red" : "gray"}
                leftSection={<IconHeart size={16} />}
                px={0}
                onClick={onLike}
              >
                {post.likeCount ?? 0}
              </Button>
              <Button
                variant="subtle"
                color="gray"
                leftSection={<IconMessageCircle size={16} />}
                px={0}
                onClick={onOpenComments}
              >
                {post.comments.length}
              </Button>
              <Button
                variant="subtle"
                color="gray"
                leftSection={
                  <IconBookmark
                    size={16}
                    fill={post.isSaved ? "currentColor" : "none"}
                  />
                }
                px={0}
                disabled={!currentUserId}
                onClick={() => setSaved.mutate({ postId: String(post.id), save: !post.isSaved })}
              >
                Save
              </Button>
              <Button
                variant="subtle"
                color="gray"
                leftSection={<IconShare3 size={16} />}
                px={0}
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    `${window.location.origin}/posts/${post.id}`,
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                }}
              >
                Share
              </Button>
            </Group>
          </Group>

          {children}
        </Stack>
      </Card>
    </>
  );
}
