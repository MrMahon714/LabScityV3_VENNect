"use client";

import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Flex,
  Group,
  Loader,
  Menu,
  Modal,
  Pill,
  PillsInput,
  Select,
  Slider,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Image,
  Anchor,
  Collapse,
  Center
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks"; 
import { RichTextEditor } from "@mantine/tiptap";
import {
  IconArrowsMaximize,
  IconBookmark,
  IconBriefcase,
  IconChevronRight,
  IconDots,
  IconFileText,
  IconFolderPlus,
  IconHeart,
  IconPhoto,
  IconMessageCircle,
  IconPlus,
  IconQuote,
  IconShare3,
  IconTrash,
  IconUsers,
  IconHeartFilled,
  IconPencil,
  IconBulb,
  IconUserSearch,
} from "@tabler/icons-react";
import StickyBox from "react-sticky-box";
import { useQuery } from "@tanstack/react-query";
import Cropper from "react-easy-crop";
import { useEditor } from "@tiptap/react";
import NextImage from "next/image";
import Link from "next/link";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/app/use-is-mobile";
import { createPostEditorExtensions } from "@/components/feed/post-rich-text-content";
import { LSPopularGroupsHomeStrip } from "@/components/groups/ls-popular-groups-home-strip";
import type { ApiResponse } from "@/lib/types/api";
import type { GetCollaboratorsResult } from "@/lib/types/collab";
import type { Product, Publication } from "@/lib/types/data";
import { getCroppedImageFile, type CropAreaPixels } from "@/lib/utils/post-image-crop";
import {
  encodeStructuredPostContent,
  normalizePostTags,
  parsePostContent,
  type StructuredPostKind,
} from "@/lib/utils/post-content";
import type { CreatePostValues } from "@/lib/validations/post";
import type { HomeFeedProps } from "./home-feed.types";
import { PostFollowButton } from "./post-follow-button";
import { useHomeFeed } from "./use-home-feed";
import { useGetUser } from "../data/use-data";
import { createClient } from "@/supabase/client";
import { FeedPostItem } from "@/lib/types/feed";
import { useSetSavedPost } from "./use-feed";
import CollabMatchingModal from "@/components/collaborators/collab-matching-modal";

const DEFAULT_EDITOR_TEXT_COLOR = "#000000";
const DEFAULT_EDITOR_FONT_SIZE = "16px";
const EDITOR_FONT_SIZE_OPTIONS = [
  { label: "Small", value: "14px" },
  { label: "Medium", value: "16px" },
  { label: "Large", value: "18px" },
  { label: "Extra Large", value: "22px" },
] as const;
const EDITOR_COLOR_OPTIONS = [
  { label: "Black", value: "#000000" },
  { label: "Blue", value: "#1D4ED8" },
  { label: "Teal", value: "#0F766E" },
  { label: "Rose", value: "#BE123C" },
  { label: "Gold", value: "#CA8A04" },
] as const;
const PINNED_POSTS_STORAGE_PREFIX = "labscity:pinned-posts";
const FEED_TAG_FILTER_LIMIT = 5;

export function HomeFeed(props: HomeFeedProps) {
  const isMobile = useIsMobile();
  const {
    posts,
    isFeedLoading,
    isFeedError,
    feedError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    activeCommentPostId,
    setActiveCommentPostId,
    isComposerOpen,
    setIsComposerOpen,
    createPostMutation,
    handleSubmitPost,
    handleAddComment,
    handleTogglePostLike,
    handleDeletePost,
    currentUserId,
  } = useHomeFeed(props);
  const [pinnedPostIds, setPinnedPostIds] = useState<string[]>([]);
  const [activeFeedTags, setActiveFeedTags] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUserId) {
      setPinnedPostIds([]);
      return;
    }

    const stored = window.localStorage.getItem(
      `${PINNED_POSTS_STORAGE_PREFIX}:${currentUserId}`,
    );

    if (!stored) {
      setPinnedPostIds([]);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as unknown;
      setPinnedPostIds(Array.isArray(parsed) ? parsed.filter(Boolean) : []);
    } catch {
      setPinnedPostIds([]);
    }
  }, [currentUserId]);

  const addFeedTag = (tag: string) => {
    const nextTag = tag.trim();

    if (!nextTag) {
      return;
    }

    setActiveFeedTags((current) =>
      normalizePostTags([...current, nextTag]).slice(0, FEED_TAG_FILTER_LIMIT),
    );
  };

  const removeFeedTag = (tag: string) => {
    setActiveFeedTags((current) =>
      current.filter(
        (currentTag) => currentTag.toLowerCase() !== tag.toLowerCase(),
      ),
    );
  };

  const displayPosts = posts
    .map((post, index) => {
      const parsed = parsePostContent(post.content);
      const isPinned = pinnedPostIds.includes(post.id);
      const postTags =
        parsed.tags.length > 0
          ? parsed.tags
          : derivePostTags({
              scientificField: post.scientificField,
              content: parsed.bodyText,
              mediaUrl: post.mediaUrl,
            });

      return {
        index,
        isPinned,
        post,
        postTags,
        priority: isPinned ? 0 : parsed.isFeatured ? 1 : 2,
      };
    })
    .filter(({ postTags }) => {
      if (activeFeedTags.length === 0) {
        return true;
      }

      const normalizedPostTags = postTags.map((tag) => tag.toLowerCase());

      return activeFeedTags.every((tag) =>
        normalizedPostTags.includes(tag.toLowerCase()),
      );
    })
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return left.index - right.index;
    });

  const setSaved = useSetSavedPost(currentUserId ?? '');

  return (
    <Box mih="calc(100vh - 56px)">
      <Flex
        maw={1320}
        mx="auto"
        px={{ base: "sm", md: "lg" }}
        py={{ base: "md", md: "xl" }}
        gap="lg"
        align="flex-start"
      >
        {!isMobile ? <HomeLeftRail {...props} /> : null}

        <Stack flex={1} miw={0} gap="lg" maw={760} mx="auto">
          <CreatePostCard
            currentUserId={props.currentUserId}
            currentUserName={
              [props.currentUser?.first_name, props.currentUser?.last_name]
                .filter(Boolean)
                .join(" ") || "Your profile"
            }
            isComposerOpen={isComposerOpen}
            onToggleComposer={() => setIsComposerOpen((current) => !current)}
            onSubmit={handleSubmitPost}
            isPending={createPostMutation.isPending}
          />

          {isFeedLoading && posts.length === 0 ? (
            <Stack align="center" justify='center'>
              <Loader />
            </Stack>
          ) : null}

          {isFeedError ? (
            <Text c="red.7">
              {feedError instanceof Error
                ? feedError.message
                : "Failed to fetch feed"}
            </Text>
          ) : null}

          {!isFeedLoading && !isFeedError && posts.length === 0 ? (
            <Card radius="md" shadow="xs" padding="lg" withBorder bg="white">
              <Text fw={800} c="gray.8">
                Your home feed is empty
              </Text>
              <Text size="sm" c="dimmed" mt={4}>
                Create the first post or explore groups and collaborators to
                start building your network.
              </Text>
            </Card>
          ) : null}

          {displayPosts.map(({ post }) => (
            <FeedPostCard
              key={post.id}
              currentUserId={currentUserId}
              post={post}
              commentOpen={activeCommentPostId === post.id}
              onToggleComments={() =>
                setActiveCommentPostId((current) =>
                  current === post.id ? null : post.id,
                )
              }
              onAddComment={handleAddComment}
              onLike={() => handleTogglePostLike(post.id)}
              onSetSaved={(postId, save) => setSaved.mutate({ postId: post.id, save: !post.isSaved })}
              onDelete={() => handleDeletePost(post.id)}
            />
          ))}

          {hasNextPage ? (
            <Button
              variant="default"
              radius="md"
              onClick={() => fetchNextPage()}
              loading={isFetchingNextPage}
            >
              Load more posts
            </Button>
          ) : null}
        </Stack>

        {!isMobile ? (
          <StickyBox offsetTop={60 + 26} offsetBottom={16}>
            <HomeRightRail
              {...props}
              activeFeedTags={activeFeedTags}
              onTrendClick={addFeedTag}
            />
          </StickyBox>
        ) : null}
      </Flex>
    </Box>
  );
}

export function CreatePostCard({
  currentUserId,
  currentUserName,
  isComposerOpen,
  onToggleComposer,
  onSubmit,
  isPending,
  type='home',
}: {
  currentUserId: string | null;
  currentUserName: string;
  isComposerOpen: boolean;
  onToggleComposer: () => void;
  onSubmit: (values: CreatePostValues & { mediaFile?: File | null }) => void;
  isPending: boolean;
  type?: string
}) {
  const [draftTitle, setDraftTitle] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [draftBodyHtml, setDraftBodyHtml] = useState("<p></p>");
  const [draftBodyText, setDraftBodyText] = useState("");
  const [isFeaturedPost, setIsFeaturedPost] = useState(false);
  const [activeTextColor, setActiveTextColor] = useState(
    DEFAULT_EDITOR_TEXT_COLOR,
  );
  const [activeFontSize, setActiveFontSize] = useState(
    DEFAULT_EDITOR_FONT_SIZE,
  );
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<CropAreaPixels | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [selectedPublicationId, setSelectedPublicationId] = useState<
    string | null
  >(null);
  const [importType, setImportType] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ["home", "composer", "products", currentUserId],
    queryFn: async () => {
      const response = await fetch(`/api/products/all?userId=${currentUserId}`);
      if(!response.ok) throw new Error("Failed to load products");
      const payload = (await response.json()) as ApiResponse<Product[]>;
      if (!payload.success) throw new Error(payload.error);

      return payload.data ?? [];
    },
    enabled:
      isComposerOpen && importType === "product" && Boolean(currentUserId),
  });

  const publicationsQuery = useQuery({
    queryKey: ["home", "composer", "publications", currentUserId],
    queryFn: async () => {
      const response = await fetch(`/api/publications/all?userId=${currentUserId}`);
      if(!response.ok) throw new Error("Failed to load products");
      const payload = (await response.json()) as ApiResponse<Publication[]>;
      if (!payload.success) throw new Error(payload.error);

      return payload.data ?? [];
    },
    enabled:
      isComposerOpen &&
      importType === "publication" &&
      Boolean(currentUserId),
  });

  const { data: profile } = useGetUser(currentUserId ?? '');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: createPostEditorExtensions("Share your update..."),
    content: draftBodyHtml,
    editorProps: {
      attributes: {
        style: `color: ${DEFAULT_EDITOR_TEXT_COLOR}; font-size: ${DEFAULT_EDITOR_FONT_SIZE};`,
      },
    },
    onCreate: ({ editor: currentEditor }) => {
      currentEditor.chain().setColor(DEFAULT_EDITOR_TEXT_COLOR).run();
      currentEditor.chain().setFontSize(DEFAULT_EDITOR_FONT_SIZE).run();
      syncEditorControls(currentEditor);
    },
    onUpdate: ({ editor: currentEditor }) => {
      setDraftBodyHtml(currentEditor.getHTML());
      setDraftBodyText(
        currentEditor.getText({ blockSeparator: "\n\n" }).trim(),
      );
      syncEditorControls(currentEditor);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      syncEditorControls(currentEditor);
    },
  });

  const selectedProduct =
    (productsQuery.data ?? []).find(
      (product) => String(product.product_id) === selectedProductId,
    ) ?? null;

  const selectedPublication =
    (publicationsQuery.data ?? []).find(
      (publication) =>
        String(publication.publication_id) === selectedPublicationId,
    ) ?? null;


  const canPublishNormalPost =
    draftTitle.trim().length > 0 &&
    draftBodyText.trim().length > 0;

  function syncEditorControls(currentEditor: NonNullable<typeof editor>) {
    const textStyle = currentEditor.getAttributes("textStyle") as {
      color?: string | null;
      fontSize?: string | null;
    };

    setActiveTextColor(textStyle.color || DEFAULT_EDITOR_TEXT_COLOR);
    setActiveFontSize(textStyle.fontSize || DEFAULT_EDITOR_FONT_SIZE);
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isComposerOpen) {
      return;
    }

    setImportType(null);
    setDraftTitle("");
    setDraftTags([]);
    setTagInput("");
    setDraftBodyHtml("<p></p>");
    setDraftBodyText("");
    setIsFeaturedPost(false);
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setCropImageUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setActiveTextColor(DEFAULT_EDITOR_TEXT_COLOR);
    setActiveFontSize(DEFAULT_EDITOR_FONT_SIZE);
    setSelectedProductId(null);
    setSelectedPublicationId(null);
    editor
      ?.chain()
      .clearContent()
      .setColor(DEFAULT_EDITOR_TEXT_COLOR)
      .setFontSize(DEFAULT_EDITOR_FONT_SIZE)
      .run();
  }, [editor, isComposerOpen]);

  useEffect(() => {
    if (!editor || importType !== "product" || !selectedProduct) {
      return;
    }

    const summary = selectedProduct.short_summary?.trim() ?? "";
    const nextTags = normalizePostTags([
      "Product",
      selectedProduct.product_type ?? "",
    ]);

    setDraftTitle(selectedProduct.title);
    setDraftTags(nextTags);
    setDraftBodyText(summary);
    setDraftBodyHtml(summary ? `<p>${escapeHtml(summary)}</p>` : "<p></p>");
    editor.commands.setContent(summary ? `<p>${escapeHtml(summary)}</p>` : "<p></p>");
    editor.chain().setColor(DEFAULT_EDITOR_TEXT_COLOR).run();
    editor.chain().setFontSize(DEFAULT_EDITOR_FONT_SIZE).run();
    syncEditorControls(editor);
  }, [importType, editor, selectedProduct]);

  useEffect(() => {
    if (!editor || importType !== "publication" || !selectedPublication) {
      return;
    }

    const summaryParts = [
      selectedPublication.journal,
      selectedPublication.date_published
        ? new Date(selectedPublication.date_published).getFullYear().toString()
        : null,
      selectedPublication.doi ? `DOI: ${selectedPublication.doi}` : null,
    ].filter(Boolean);
    const summary = summaryParts.join(" - ");
    const nextTags = normalizePostTags([
      "Article",
      ...(selectedPublication.is_oa || selectedPublication.pdf_url
        ? ["Full-text available"]
        : []),
      ...(selectedPublication.tags?.map(t => t.name) ?? []),
    ]);

    setDraftTitle(selectedPublication.title);
    setDraftTags(nextTags);
    setDraftBodyText(summary);
    setDraftBodyHtml(summary ? `<p>${escapeHtml(summary)}</p>` : "<p></p>");
    editor.commands.setContent(summary ? `<p>${escapeHtml(summary)}</p>` : "<p></p>");
    editor.chain().setColor(DEFAULT_EDITOR_TEXT_COLOR).run();
    editor.chain().setFontSize(DEFAULT_EDITOR_FONT_SIZE).run();
    syncEditorControls(editor);
  }, [importType, editor, selectedPublication]);

  useEffect(() => {
    return () => {
      if (mediaPreviewUrl) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }

      if (cropImageUrl) {
        URL.revokeObjectURL(cropImageUrl);
      }
    };
  }, [cropImageUrl, mediaPreviewUrl]);

  const addTag = () => {
    const nextTag = tagInput.trim();

    if (!nextTag) {
      return;
    }

    setDraftTags((current) => normalizePostTags([...current, nextTag]));
    setTagInput("");
  };

  const activeColorOption =
    EDITOR_COLOR_OPTIONS.find(
      (option) => option.value.toLowerCase() === activeTextColor.toLowerCase(),
    ) ?? EDITOR_COLOR_OPTIONS[0];

  const resetComposer = () => {
    setDraftTitle("");
    setDraftTags([]);
    setTagInput("");
    setDraftBodyHtml("<p></p>");
    setDraftBodyText("");
    setIsFeaturedPost(false);
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setCropImageUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setActiveTextColor(DEFAULT_EDITOR_TEXT_COLOR);
    setActiveFontSize(DEFAULT_EDITOR_FONT_SIZE);
    setSelectedProductId(null);
    setSelectedPublicationId(null);
    editor
      ?.chain()
      .clearContent()
      .setColor(DEFAULT_EDITOR_TEXT_COLOR)
      .setFontSize(DEFAULT_EDITOR_FONT_SIZE)
      .run();
  };

  const handlePublish = () => {
    if (!canPublishNormalPost) {
      return;
    }

    onSubmit({
      content: encodeStructuredPostContent({
        kind: "normal",
        title: draftTitle,
        bodyHtml: draftBodyHtml,
        bodyText: draftBodyText,
        tags: draftTags,
        isFeatured: isFeaturedPost,
        linkedEntity: null,
      }),
      scientificField: draftTags[0] ?? "General",
      category: "general",
      mediaFile,
    });
    resetComposer();
  };

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null;

    if (!file) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCropImageUrl(objectUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    event.currentTarget.value = "";
  };

  const handleCropConfirm = async () => {
    if (!cropImageUrl || !croppedAreaPixels) {
      return;
    }

    const croppedFile = await getCroppedImageFile(
      cropImageUrl,
      croppedAreaPixels,
      `post-image-${Date.now()}.jpg`,
    );

    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }

    const nextPreviewUrl = URL.createObjectURL(croppedFile);
    setMediaFile(croppedFile);
    setMediaPreviewUrl(nextPreviewUrl);
    URL.revokeObjectURL(cropImageUrl);
    setCropImageUrl(null);
  };

  return (
    <>
      <Modal
        opened={cropImageUrl != null}
        onClose={() => {
          if (cropImageUrl) {
            URL.revokeObjectURL(cropImageUrl);
          }
          setCropImageUrl(null);
        }}
        title="Crop image"
        centered
        size="lg"
      >
        <Stack gap="md">
          <Box
            h={360}
            style={{
              position: "relative",
              borderRadius: 16,
              overflow: "hidden",
              background: "#0F172A",
            }}
          >
            {cropImageUrl ? (
              <Cropper
                image={cropImageUrl}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, croppedPixels) =>
                  setCroppedAreaPixels(croppedPixels)
                }
              />
            ) : null}
          </Box>
          <Stack gap={4}>
            <Text size="sm" fw={600}>
              Zoom
            </Text>
            <Slider
              value={zoom}
              onChange={setZoom}
              min={1}
              max={3}
              step={0.1}
            />
          </Stack>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                if (cropImageUrl) {
                  URL.revokeObjectURL(cropImageUrl);
                }
                setCropImageUrl(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleCropConfirm()}>Use image</Button>
          </Group>
        </Stack>
      </Modal>

      <Card
        radius="md"
        padding="md"
        bd='1px solid gray.3'
        shadow='xs'
      >
        <Stack>
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <Avatar radius="xl" color="navy.7" size={36} src={profile?.avatar_url}>
                {initials(currentUserName)}
              </Avatar>
              <Box>
                <Text size="sm" fw={800} c="navy.7">
                  {
                    type === 'home' ? "What are you working on" :
                    type === 'group' ? "Share an update with the group" :
                    'Make a post'
                  }
                </Text>
                <Text size="xs" c="dimmed">
                  Ask a question, share progress, or start a discussion
                </Text>
              </Box>
            </Group>
            <Group gap='xs'>
              <Button
                leftSection={isComposerOpen ? undefined : <IconPlus size={15} />}
                variant={isComposerOpen ? 'outline' : 'filled'}
                onClick={onToggleComposer}
              >
                {isComposerOpen ? "Cancel" : "New Post"}
              </Button>
              {
                isComposerOpen && 
                <Button
                  loading={isPending}
                  disabled={!canPublishNormalPost}
                  onClick={handlePublish}
                  w='fit-content'
                >
                  Publish Post
                </Button>
              }
            </Group>
            
          </Group>

          {/* TODO (For future team): Redesign filter posts by tag, placing it somewhere outside of post composer  */}
          {/* <Group
            justify="space-between"
            align="center"
            wrap="wrap"
            pt="sm"
            style={{ borderTop: "1px solid #F3F4F6" }}
          >
            <Group gap="xs" wrap="wrap">
              <Text size="xs" fw={800} c="#94A3B8" tt="uppercase">
                Show
              </Text>
              {activeFeedTags.map((tag) => (
                <Pill key={`feed-filter-${tag}`} withRemoveButton onRemove={() => onRemoveFeedTag(tag)}>
                  {tag}
                </Pill>
              ))}
              {isFeedTagInputOpen ? (
                <TextInput
                  value={feedTagInput}
                  onChange={(event) => setFeedTagInput(event.currentTarget.value)}
                  placeholder="Add tag"
                  size="xs"
                  w={132}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      handleAddFeedTag();
                    }

                    if (
                      event.key === "Backspace" &&
                      event.currentTarget.value.length === 0
                    ) {
                      event.preventDefault();
                    }

                    if (event.key === "Escape") {
                      setIsFeedTagInputOpen(false);
                      setFeedTagInput("");
                    }
                  }}
                />
              ) : null}
              <Button
                variant="light"
                radius="xl"
                size="compact-sm"
                onClick={() => setIsFeedTagInputOpen((current) => !current)}
              >
                Add Tags
              </Button>
            </Group>
          </Group> */}

          {isComposerOpen ? (
          <>
            <Group>
              <Select 
                label='Post about a...'
                placeholder="Publication or Product"
                data={[
                  { value: "publication", label: "Publication" },
                  { value: "product", label: "Product" },
                ]}
                value={importType}
                onChange={setImportType}
                w='22ch'
                clearable
              />
              <Collapse in={importType !== null} flex='1'>
                {importType === "publication" ? (
                  <Select
                    label="Choose one of your publications"
                    placeholder="Select a publication"
                    value={selectedPublicationId}
                    onChange={setSelectedPublicationId}
                    data={(publicationsQuery.data ?? []).map((publication) => ({
                      value: String(publication.publication_id),
                      label: publication.title,
                    }))}
                    rightSection={
                      publicationsQuery.isLoading ? <Loader size={16} /> : null
                    }
                    searchable
                  />
                ) : importType === "product" ? (
                  <Select
                    label="Choose one of your products"
                    placeholder="Select a product"
                    value={selectedProductId}
                    onChange={setSelectedProductId}
                    data={(productsQuery.data ?? []).map((product) => ({
                      value: String(product.product_id),
                      label: product.title,
                    }))}
                    rightSection={
                      productsQuery.isLoading ? <Loader size={16} /> : null
                    }
                  />
                ) : null}
              </Collapse>
            </Group>

            <Stack gap="sm">

              <Textarea
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.currentTarget.value)}
                label="Post Title"
                placeholder="Give your post a clear title"
                withAsterisk
                autosize
                minRows={1}
              />

              <Stack gap={6}>
                <Text size="sm" fw={600} c="#334155">
                  Tags
                </Text>
                <PillsInput
                  radius="md"
                  styles={{
                    input: {
                      borderColor: "#E5E7EB",
                    },
                  }}
                >
                  <Pill.Group>
                    {draftTags.map((tag) => (
                      <Pill
                        key={tag}
                        withRemoveButton
                        onRemove={() =>
                          setDraftTags((current) =>
                            current.filter((currentTag) => currentTag !== tag),
                          )
                        }
                      >
                        {tag}
                      </Pill>
                    ))}
                    <PillsInput.Field
                      value={tagInput}
                      onChange={(event) => setTagInput(event.currentTarget.value)}
                      placeholder={
                        draftTags.length === 0
                          ? "Add tags and press Enter"
                          : "Add another tag"
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === ",") {
                          event.preventDefault();
                          addTag();
                        }

                        if (
                          event.key === "Backspace" &&
                          event.currentTarget.value.length === 0
                        ) {
                          event.preventDefault();
                        }
                      }}
                    />
                  </Pill.Group>
                </PillsInput>
                <Group gap="xs">
                  <Button
                    variant="light"
                    radius="xl"
                    size="compact-sm"
                    onClick={addTag}
                    disabled={tagInput.trim().length === 0}
                  >
                    Add tag
                  </Button>
                  <Text size="xs" c="dimmed">
                    Tags are optional for regular posts.
                  </Text>
                </Group>
              </Stack>

              <Stack gap={6}>
                <Group justify="space-between" wrap="wrap" gap="xs">
                  <Text component='label' size="sm" fw={600} c="#334155">
                    Body <Text component='span' size='sm' c='red'>*</Text>
                  </Text>
                  <Group gap="xs">
                    <Select
                      aria-label="Font size"
                      data={EDITOR_FONT_SIZE_OPTIONS.map((option) => ({
                        label: option.label,
                        value: option.value,
                      }))}
                      value={activeFontSize}
                      onChange={(value) => {
                        if (!value || !editor) {
                          return;
                        }

                        editor.chain().focus().setFontSize(value).run();
                        setActiveFontSize(value);
                      }}
                      size="xs"
                      w={110}
                    />
                    <Menu withinPortal position="bottom-end">
                      <Menu.Target>
                        <Button
                          variant="default"
                          size="xs"
                          w={138}
                          justify="space-between"
                          title={activeColorOption.label.toLowerCase()}
                          leftSection={
                            <Box
                              w={12}
                              h={12}
                              style={{
                                borderRadius: 999,
                                backgroundColor: activeColorOption.value,
                                border: "1px solid #CBD5E1",
                              }}
                            />
                          }
                        >
                          {activeColorOption.label}
                        </Button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {EDITOR_COLOR_OPTIONS.map((option) => (
                          <Menu.Item
                            key={option.value}
                            onClick={() => {
                              setActiveTextColor(option.value);
                              editor?.chain().focus().setColor(option.value).run();
                            }}
                            leftSection={
                              <Box
                                w={12}
                                h={12}
                                style={{
                                  borderRadius: 999,
                                  backgroundColor: option.value,
                                  border: "1px solid #CBD5E1",
                                }}
                              />
                            }
                          >
                            {option.label}
                          </Menu.Item>
                        ))}
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Group>

                <RichTextEditor
                  editor={editor}
                  styles={{
                    root: {
                      borderColor: "#E5E7EB",
                      borderRadius: 16,
                      overflow: "hidden",
                    },
                    toolbar: {
                      borderColor: "#E5E7EB",
                    },
                    content: {
                      minHeight: 180,
                      borderColor: "#E5E7EB",
                      backgroundColor: "#FFFFFF",
                      color: DEFAULT_EDITOR_TEXT_COLOR,
                      "& .ProseMirror": {
                        color: DEFAULT_EDITOR_TEXT_COLOR,
                        fontSize: DEFAULT_EDITOR_FONT_SIZE,
                      },
                    },
                  }}
                >
                  <RichTextEditor.Toolbar sticky={false}>
                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.Bold />
                      <RichTextEditor.Italic />
                      <RichTextEditor.Strikethrough />
                      <RichTextEditor.ClearFormatting />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.BulletList />
                      <RichTextEditor.OrderedList />
                      <RichTextEditor.Blockquote />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                      <RichTextEditor.AlignLeft />
                      <RichTextEditor.AlignCenter />
                      <RichTextEditor.AlignRight />
                    </RichTextEditor.ControlsGroup>
                  </RichTextEditor.Toolbar>

                  <RichTextEditor.Content />
                </RichTextEditor>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={handleFileSelected}
                />
                <Group justify="space-between" wrap="wrap">
                  <Button
                    radius="xl"
                    leftSection={mediaPreviewUrl ? <IconPencil size='1rem' /> : <IconPhoto size='1rem' />}
                    onClick={() => fileInputRef.current?.click()}
                    variant='outline'
                    bd={mediaPreviewUrl ? '1px solid' : '1px dashed'}
                    c={mediaPreviewUrl ? 'navy' : 'dimmed'}
                  >
                    {mediaPreviewUrl ? 'Change' : 'Add'} image
                  </Button>
                  {mediaPreviewUrl ? (
                    <Button
                      variant="subtle"
                      color="red"
                      onClick={() => {
                        if (mediaPreviewUrl) {
                          URL.revokeObjectURL(mediaPreviewUrl);
                        }
                        setMediaPreviewUrl(null);
                        setMediaFile(null);
                      }}
                    >
                      Remove image
                    </Button>
                  ) : null}
                </Group>
                {mediaPreviewUrl ? (
                  <Box
                    style={{
                      borderRadius: 16,
                      overflow: "hidden",
                      border: "1px solid #E5E7EB",
                      aspectRatio: "16 / 9",
                      position: "relative",
                    }}
                  >
                    <Image
                      component={NextImage}
                      src={mediaPreviewUrl}
                      alt="Selected post image"
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  </Box>
                ) : null}
              </Stack>
            </Stack>
          </>
          ) : null}
        </Stack>
      </Card>
    </>
  );
}

export function FeedPostCard({
  post,
  currentUserId,
  commentOpen,
  onToggleComments,
  onAddComment,
  onLike,
  onSetSaved,
  onDelete,
  hideYourPostBadge
}: {
  post: FeedPostItem;
  currentUserId: string | null;
  commentOpen?: boolean;
  onToggleComments?: () => void;
  onAddComment: (postId: string, values: { content: string }) => Promise<void>;
  onLike: () => void;
  onSetSaved: (postId: string, save: boolean) => void;
  onDelete: () => void;
  hideYourPostBadge?: boolean;
}) {
  const isOwnPost = currentUserId != null && currentUserId === post.userId;
  const [comment, setComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [copied, setCopied] = useState(false);
  const parsedContent = parsePostContent(post.content);
  const title = parsedContent.title;
  const description = parsedContent.bodyText;
  const inferredTags =
    parsedContent.tags.length > 0
      ? parsedContent.tags
      : derivePostTags({
          scientificField: post.scientificField,
          content: parsedContent.bodyText,
          mediaUrl: post.mediaUrl,
        });
  const isCitable =
    parsedContent.kind === "publication" || inferredTags.includes("Article");

  return (
    <Card
      radius="md"
      shadow='xs'
      withBorder
      bg="white"
      p="lg"
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="xs" wrap="wrap">
            {isOwnPost && !hideYourPostBadge? (
              <Badge
                radius="xl"
                variant="light"
                style={{
                  background: "#EEF2FF",
                  color: "#1D4ED8",
                  border: "1px solid #C7D2FE",
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
                color="blue"
                leftSection={
                  tag === "Article" ? <IconFileText size={10} /> : undefined
                }
                style={{
                  background: tag === "Article" ? "#EFF6FF" : "#EEF2FF",
                  color: "#2563EB",
                  border: "1px solid #BFDBFE",
                }}
              >
                {tag}
              </Badge>
            ))}
          </Group>
          <Group gap={4} wrap="nowrap">
            {isOwnPost ? (
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label="Post actions"
                  >
                    <IconDots size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={onDelete}
                  >
                    Delete post
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : null}
          </Group>
        </Group>

        <Stack gap={8}>
          <Box>
            <Anchor
              component={Link}
              href={`/posts/${post.id}`}
              fw={700}
              fz={17}
              c="#111827"
              style={{
                lineHeight: 1.4,
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              {title}
            </Anchor>
          </Box>
          <Text
            size="sm"
            c="#475569"
            lh={1.6}
            lineClamp={3}
            style={{
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {description}
          </Text>
        </Stack>

        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <Avatar 
              size={28} 
              src={post.avatarUrl ?? undefined} 
              color="blue"
              component={Link}
              href={`/profile/${post.userId}`}
            >
              {initials(post.userName)}
            </Avatar>
            
            <Text
              size="sm"
              style={{
                minWidth: 0,
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              <Anchor
                component={Link}
                href={`/profile/${post.userId}`}
                underline="hover"
              >
                <Text 
                  span
                  c="#1F2937"
                  fw={600}
                >
                  {post.userName}
                </Text>
              </Anchor>
              <Text span c="#64748B" fw={400}>
                {" "}
                · {post.timeAgo}
              </Text>
            </Text>
            
            {!isOwnPost ? (
              <PostFollowButton
                currentUserId={currentUserId}
                targetUserId={post.userId}
              />
            ) : null}
          </Group>
          <Text size="sm" c="#2563EB">
            {copied ? "Link copied" : ""}
          </Text>
        </Group>

        {post.mediaUrl ? (
          <Box
            pos="relative"
            mah={600}
            maw='100%'
            fw={600}
            style={{
              aspectRatio: `${(post.mediaWidth ?? 1) / (post.mediaHeight ?? 1)}`,
              overflow: "hidden",
              letterSpacing: "0.3px",
            }}
          >
            <Image
              component={NextImage}
              src={post.mediaUrl}
              alt="Post attachment"
              bdrs="lg"
              bg='navy.0'
              fill
              mah={600}
              style={{ objectFit: "contain" }}
            />
          </Box>
        ) : null}

        <Divider color="#E5E7EB" />

        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="lg">
            <Button
              variant="subtle"
              color={post.isLiked ? "red" : "gray"}
              leftSection={post.isLiked ? <IconHeartFilled size={16}/> : <IconHeart size={16} />}
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
              onClick={onToggleComments}
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
              onClick={() => onSetSaved?.(String(post.id), !post.isSaved)}
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
          <Group gap="sm">
            <Button
              component={Link}
              href={`/posts/${post.id}`}
              radius="md"
              rightSection={<IconChevronRight size={14} />}
              bg='navy.7'
            >
              View
            </Button>
          </Group>
        </Group>

        {commentOpen ? (
          <Stack gap="sm">
            <Divider />
            {post.comments
              .filter((item) => !item.parentCommentId)
              .map((item) => (
              <Group key={item.id} align="flex-start" wrap="nowrap">
                <Avatar size="sm" radius="xl" src={item.avatarUrl ?? undefined}>
                  {initials(item.userName)}
                </Avatar>
                <Box style={{ minWidth: 0, flex: 1 }}>
                  <Text size="sm" fw={700}>
                    {item.userName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {item.timeAgo}
                  </Text>
                  <Text
                    size="sm"
                    mt={4}
                    style={{
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    {item.content}
                  </Text>
                </Box>
              </Group>
            ))}
            <Textarea
              placeholder="Add a comment..."
              value={comment}
              onChange={(event) => setComment(event.currentTarget.value)}
              minRows={2}
              styles={{
                input: {
                  borderRadius: 14,
                  borderColor: "#E5E7EB",
                },
              }}
            />
            <Group justify="flex-end">
              <Button
                size="compact-sm"
                color="navy"
                loading={isSubmittingComment}
                disabled={comment.trim().length === 0}
                onClick={async () => {
                  setIsSubmittingComment(true);
                  try {
                    await onAddComment(post.id, { content: comment });
                    setComment("");
                  } finally {
                    setIsSubmittingComment(false);
                  }
                }}
              >
                Post Comment
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}

function HomeLeftRail({ currentUser }: HomeFeedProps) {
  return (
    <Stack w={228} gap="md" pos="sticky" top={80}>
      <Card radius="md" shadow="xs" padding="md" withBorder>
        <Stack align="center" gap={8}>
          <Avatar
            size={58}
            radius="xl"
            color="navy.7"
            src={currentUser?.avatar_url ?? undefined}
          >
            {initials(
              [currentUser?.first_name, currentUser?.last_name]
                .filter(Boolean)
                .join(" "),
            )}
          </Avatar>
          <Text ta="center" size="sm" fw={800}>
            {[currentUser?.first_name, currentUser?.last_name]
              .filter(Boolean)
              .join(" ") || "Your profile"}
          </Text>
          <Text ta="center" size="xs" c="dimmed">
            {currentUser?.occupation || "Researcher"}
          </Text>
          <Text ta="center" size="xs" c="dimmed">
            {currentUser?.workplace || "LabScity member"}
          </Text>
          <Button
            component={Link}
            href="/profile"
            size="compact-sm"
            variant="light"
            color="navy"
            radius="xl"
          >
            View profile
          </Button>
        </Stack>
      </Card>

      <Card radius="md" shadow="xs" padding="sm" withBorder>
        <Stack gap={6}>
          <Text size="xs" fw={800} c="gray.5" tt="uppercase" px={4}>
            Quick Actions
          </Text>
          <RailButton
            icon={<IconFileText size={16} />}
            label="Add Publication"
            href="/profile?tab=publications&action=add-publication"
          />
          <RailButton
            icon={<IconBriefcase size={16} />}
            label="Post Job"
            href="/jobs/new"
          />
          <RailButton
            icon={<IconFolderPlus size={16} />}
            label="Create Group"
            href="/groups?tab=mine&action=create"
          />
          <RailButton
            icon={<IconPlus size={16} />}
            label="Add Product"
            href="/profile?tab=products&action=add-product"
          />
        </Stack>
      </Card>
    </Stack>
  );
}

export function RecommendedCollabsCard({ currentUserId }: { currentUserId: string | null }) {
  const collaboratorsQuery = useQuery({
    queryKey: ["home", "collaborators", currentUserId],
    queryFn: async () => {
      const res = await fetch("/api/collaborators");
      if (!res.ok) {
        throw new Error("Failed to fetch collaborators");
      }
      const data = (await res.json()) as GetCollaboratorsResult[];
      return data;
    },
    enabled: Boolean(currentUserId),
  });
  
  const supabase = createClient();
  const [matchingOpened, { open: openMatching, close: closeMatching }] =
    useDisclosure(false);

  return (
  <>
      <CollabMatchingModal opened={matchingOpened} onClose={closeMatching} />
      <SectionCard
        title="Recommended Collaborators"
        icon={<IconUsers size={18} />}
        headerAction={
          <ActionIcon
            variant="subtle"
            color="gray"
            radius="md"
            onClick={openMatching}
            aria-label="Expand collaborator matching"
          >
            <IconArrowsMaximize size={14} />
          </ActionIcon>
        }
      >
      <Stack gap={0}>
        {(collaboratorsQuery.data ?? []).length > 0 
        ? 
        (collaboratorsQuery.data ?? []).slice(0, 3).map((person) => {
          const { data } = supabase.storage
            .from("profile_pictures")
            .getPublicUrl(person?.profile_pic_path ?? '');

          return (
            <Group
              key={person.profile_user_id}
              py="sm"
              wrap="nowrap"
              style={{ borderBottom: "1px solid var(--mantine-color-gray-1)" }}
            >
              <Avatar 
                component={Link} 
                href={`/profile/${person.profile_user_id}`} 
                radius="xl" 
                color="blue"
                src={data.publicUrl}
              >
                {initials(`${person.first_name} ${person.last_name}`)}
              </Avatar>
              <Box flex={1} miw={0}>
                <Anchor component={Link} href={`/profile/${person.profile_user_id}`}>
                  <Text size="sm" fw={800} truncate>
                    {person.first_name} {person.last_name}
                  </Text>
                </Anchor>
                <Text size="xs" c="dimmed" truncate>
                  {person.occupation || person.workplace || "Researcher"}
                </Text>
                {/* <Badge size="xs" color="green" variant="light" mt={4}>
                  {Math.round(person.cosine_similarity * 100)}% match
                </Badge> */}
              </Box>
              <PostFollowButton
                currentUserId={currentUserId ?? null}
                targetUserId={person.profile_user_id}
              />
            </Group>
          )
        })
        : 
        !collaboratorsQuery.isLoading && 
          <Stack align='center' justify='center'>
            <IconUserSearch size='3rem' color='var(--mantine-color-dimmed)' stroke={1.25}/>
            <Text ta='center' c='dimmed' fz='xs'>
              Fill your profile with your research areas, skills, or works to begin getting recommendations.
            </Text>
          </Stack>
        }
        {collaboratorsQuery.isLoading ? (
          <Center>
            <Loader />
          </Center>
        ) : null}
      </Stack>
    </SectionCard>
  </>
  )
} 

function HomeRightRail({
  currentUserId,
  trendingTags,
  activeFeedTags,
  onTrendClick,
  searchPublicGroupsAction,
  joinGroupAction,
  getGroupsAction,
}: HomeFeedProps & {
  activeFeedTags: string[];
  onTrendClick: (tag: string) => void;
}) {
  return (
    <Stack w={320} gap="md" pos="sticky" top={80}>
      <RecommendedCollabsCard currentUserId={currentUserId} />

      {/* <SectionCard
        title="Trending Research"
        icon={<IconTrendingUp size={18} />}
        accent="teal"
      >
        <Stack gap={4}>
          {(trendingTags ?? []).slice(0, 5).map((tag, i) => (
            <Button
              key={`${tag}${i}}`}
              variant={
                activeFeedTags.some(
                  (activeTag) => activeTag.toLowerCase() === String(tag).toLowerCase(),
                )
                  ? "light"
                  : "subtle"
              }
              color="gray"
              justify="space-between"
              px="xs"
              rightSection={<IconChevronRight size={14} />}
              onClick={() => onTrendClick(String(tag))}
            >
              <Group gap="sm">
                <Text size="sm" fw={800} c="gray.4">
                  {Math.max(1, (trendingTags ?? []).indexOf(tag) + 1)}
                </Text>
                <Text size="sm" c="gray.8">
                  #{String(tag).replace(/\s+/g, "")}
                </Text>
              </Group>
            </Button>
          ))}
        </Stack>
      </SectionCard> */}

      {searchPublicGroupsAction && joinGroupAction && getGroupsAction ? (
        <LSPopularGroupsHomeStrip
          searchPublicGroupsAction={searchPublicGroupsAction}
          joinGroupAction={joinGroupAction}
          getGroupsAction={getGroupsAction}
        />
      ) : null}
    </Stack>
  );
}

function SectionCard({
  title,
  icon,
  actionLabel,
  headerAction,
  accent = "navy",
  children,
}: {
  title: string;
  icon: React.ReactNode;
  actionLabel?: string;
  headerAction?: React.ReactNode;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <Card radius="md" shadow="xs" padding="md" withBorder bg="white">
      <Group justify="space-between" mb="sm" wrap="nowrap" align="flex-start">
        <Group gap="xs" wrap="nowrap" miw={0}>
          <ThemeIcon variant="light" color={accent} radius="md" size="sm">
            {icon}
          </ThemeIcon>
          <Text size="sm" fw={850}>
            {title}
          </Text>
        </Group>
        <Group gap="xs" wrap="nowrap">
          {headerAction}
          {actionLabel ? (
            <Button
            variant="subtle"
            color="blue"
            size="compact-xs"
            rightSection={<IconChevronRight size={12} />}
            disabled
          >
            {actionLabel}
          </Button>
         ) : null}
       </Group>
      </Group>
     {children}
    </Card>
  );
}

function RailButton({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
}) {
  const content = (
    <Group gap="sm" wrap="nowrap" w="100%">
      <ThemeIcon variant="light" color="navy" radius="md" size="sm">
        {icon}
      </ThemeIcon>
      <Text size="sm" fw={650}>
        {label}
      </Text>
      <IconChevronRight size={14} style={{ marginLeft: "auto" }} />
    </Group>
  );

  if (href) {
    return (
      <Button
        component={Link}
        href={href}
        variant="subtle"
        color="gray"
        justify="flex-start"
      >
        {content}
      </Button>
    );
  }

  return (
    <Button variant="subtle" color="gray" justify="flex-start" disabled>
      {content}
    </Button>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function derivePostTags(post: {
  scientificField: string;
  content: string;
  mediaUrl?: string | null;
}) {
  const tags: string[] = [];
  const normalizedContent = (post.content ?? '').toLowerCase();
  const normalizedField = (post.scientificField ?? '').trim().toLowerCase();

  const looksLikeArticle =
    normalizedContent.includes("doi.org/") ||
    normalizedContent.includes("doi:") ||
    normalizedContent.includes("published in") ||
    normalizedContent.includes("journal") ||
    normalizedContent.includes("full-text");

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
