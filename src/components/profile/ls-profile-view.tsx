"use client";

import { 
  Box, 
  Button, 
  Divider, 
  Flex, 
  Stack, 
  Tabs,
  Text 
} from "@mantine/core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { useIsMobile } from "@/app/use-is-mobile";
import { useCreateChat } from "@/components/chat/use-chat";
import { LSCommentComposer } from "@/components/feed/ls-comment-composer";
import { LSPostCard } from "@/components/feed/ls-post-card";
import { LSPostCommentCard } from "@/components/feed/ls-post-comment-card";
import LSMiniProfileList from "@/components/profile/ls-mini-profile-list";
import { LSProfileGroupsWidget } from "@/components/profile/ls-profile-groups-widget";
import LSProfileHero from "@/components/profile/ls-profile-hero";
import { LSUserReportOverlay } from "@/components/profile/ls-user-report-overlay";
import { LSSpinner } from "@/components/ui/ls-spinner";
import type { createUserReport } from "@/lib/actions/profile";
import classes from "./ls-profile-view.module.css"

/**
 * Formats a date string as a relative time for post/comment display.
 *
 * @param date - ISO date string or parseable date.
 * @returns "just now", "5m ago", "3h ago", "2d ago", or toLocaleDateString() for older dates.
 */
export function getTimeAgo(date: string): string {
  const now = new Date();
  const postDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);
  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return postDate.toLocaleDateString();
}

import type {
  CreateCommentAction,
  CreatePostAction,
  CreateReportAction,
  DeletePostAction,
  LikeCommentAction,
  LikePostAction,
  UpdatePostAction,
} from "@/components/feed/home-feed.types";
import type {
  FollowProfileHeroProps,
  ProfileMediaUploadProps,
  ProfilePostActionsResult,
} from "@/components/profile/use-ls-profile-view";
import { useLSProfileView } from "@/components/profile/use-ls-profile-view";
import {
  useUserFollowing,
  useUserFriends,
  useUserPosts,
  useUserProfile,
} from "@/components/profile/use-profile";
import type {
  createProfileHeaderUploadUrl,
  createProfilePictureUploadUrl,
  toggleFollowAction,
  updateOwnProfileHeader,
  updateOwnProfilePicture,
  updateProfileAction,
} from "@/lib/actions/profile";
import LSPublicationsList from "./publications/ls-publications-list";
import LSProductsList from "./products/ls-products-list";
import LSGrantsList from "./grants/ls-grants-list";
import { getLegacyPostText } from "@/lib/utils/post-content";
import { FeedPostCard, RecommendedCollabsCard } from "../feed/home-feed";
import StickyBox from "react-sticky-box";
import { LSBookmarksTab } from "./bookmarks/ls-bookmarks-tab";
import { useSetSavedPost } from "../feed/use-feed";
import { IconBoxOff, IconMessageCircleOff } from "@tabler/icons-react";

type UpdateProfileAction = typeof updateProfileAction;
type ToggleFollowAction = typeof toggleFollowAction;
type CreateProfilePictureUploadUrlAction = typeof createProfilePictureUploadUrl;
type UpdateOwnProfilePictureAction = typeof updateOwnProfilePicture;
type CreateProfileHeaderUploadUrlAction = typeof createProfileHeaderUploadUrl;
type UpdateOwnProfileHeaderAction = typeof updateOwnProfileHeader;
type ProfileTab = "posts" | "publications" | "grants" | "products" | "bookmarks";
type ProfileAction = "add-publication" | "add-product";

/**
 * Props for LSProfileView — passed from the profile page server component.
 *
 * @param userId - Profile owner's user ID (drives all data queries).
 * @param isOwnProfile - Whether the viewer owns this profile (controls edit vs follow UI).
 * @param currentUserId - Authenticated user id; used to derive isFollowing when viewing others.
 * @param updateProfileAction - Server action to update profile (about, workplace, occupation, skill, articles).
 * @param toggleFollowAction - Server action to follow/unfollow the profile owner.
 * @param createProfilePictureUploadUrlAction - Server action to get signed URL for profile pic upload.
 * @param updateOwnProfilePictureAction - Server action to persist profile pic path after upload.
 * @param createProfileHeaderUploadUrlAction - Server action to get signed URL for banner upload.
 * @param updateOwnProfileHeaderAction - Server action to persist banner path after upload.
 * @param createPostAction - Server action to create a post (passed for consistency; profile posts use feed actions).
 * @param createCommentAction - Server action to add a comment.
 * @param createReportAction - Server action to submit a report.
 * @param createUserReportAction - Server action to report a user.
 * @param likePostAction - Server action to toggle post like.
 * @param likeCommentAction - Server action to toggle comment like.
 */
export interface LSProfileViewProps {
  userId: string;
  isOwnProfile: boolean;
  currentUserId: string | null;
  updateProfileAction: UpdateProfileAction;
  toggleFollowAction: ToggleFollowAction;
  createProfilePictureUploadUrlAction: CreateProfilePictureUploadUrlAction;
  updateOwnProfilePictureAction: UpdateOwnProfilePictureAction;
  createProfileHeaderUploadUrlAction: CreateProfileHeaderUploadUrlAction;
  updateOwnProfileHeaderAction: UpdateOwnProfileHeaderAction;
  createPostAction: CreatePostAction;
  createCommentAction: CreateCommentAction;
  createReportAction: CreateReportAction;
  createUserReportAction: typeof createUserReport;
  likePostAction: LikePostAction;
  likeCommentAction: LikeCommentAction;
  deletePostAction: DeletePostAction;
  updatePostAction: UpdatePostAction;
  initialTab?: Exclude<ProfileTab, "posts">;
  profileAction?: ProfileAction;
}

/** Props for mobile layout — single-column stack of hero, posts, friends, following. */
interface LSProfileMobileLayoutProps {
  userId: string;
  isOwnProfile: boolean;
  actions: ProfilePostActionsResult;
  followProfile?: FollowProfileHeroProps;
  mediaUpload?: ProfileMediaUploadProps;
  onMessageClick?: () => void;
  isMessagePending?: boolean;
  onReportClick?: () => void;
}

/**
 * Mobile profile layout — stacks hero, friends, following, groups, then posts.
 *
 * @param userId        - Profile owner's user ID (drives all data queries).
 * @param isOwnProfile  - Whether the viewer owns this profile (controls edit UI).
 * @param actions       - Post-related mutation handlers (like, comment, report).
 * @param editProfile   - Edit-modal state & callbacks for the hero section.
 * @param followProfile - Follow/unfollow state & callback (omitted for own profile).
 * @param mediaUpload   - Profile pic & banner upload handlers (omitted for other users).
 */
const LSProfileMobileLayout = ({
  userId,
  isOwnProfile,
  actions,
  followProfile,
  mediaUpload,
  onMessageClick,
  isMessagePending,
  onReportClick,
}: LSProfileMobileLayoutProps) => {
  const router = useRouter();
  const profileQuery = useUserProfile(userId);
  const profile = profileQuery.data;
  const username = `${profile?.first_name} ${profile?.last_name}`;
  const userPostsQuery = useUserPosts(userId);
  const posts = userPostsQuery.data?.pages.flatMap((p) => p.posts) ?? [];
  const followingQuery = useUserFollowing(userId);
  const following = followingQuery.data;
  const friendsQuery = useUserFriends(userId);
  const friends = friendsQuery.data;

  const friendIds = new Set(friends?.map((friend) => friend.user_id));
  const notFollowedBack = following?.filter((u) => !friendIds.has(u.user_id));

  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  );

  const hasNextPage = userPostsQuery.hasNextPage ?? false;
  const isFetchingNextPage = userPostsQuery.isFetchingNextPage ?? false;

  const listPosts = posts.map((post) => {
    const postId = String(post.post_id);
    const comments = post.comments ?? [];

    return (
      <li key={postId}>
        <LSPostCard
          userId={post.user_id}
          userName={username ?? "Unknown User"}
          avatarUrl={profile?.avatar_url ?? undefined}
          field={post.scientific_field ?? post.category ?? "—"}
          timeAgo={getTimeAgo(post.created_at)}
          content={getLegacyPostText(post.text)}
          mediaUrl={post.media_url ?? null}
          onLikeClick={() => actions.handleTogglePostLike(postId)}
          onCommentClick={() =>
            setActiveCommentPostId((current) =>
              current === postId ? null : postId,
            )
          }
          isLiked={post.isLiked ?? false}
          likeCount={post.like_amount ?? 0}
          commentCount={post.comments?.length ?? 0}
          showMenu={isOwnProfile}
          onDeleteClick={
            isOwnProfile ? () => actions.handleDeletePost(postId) : undefined
          }
          onEditSubmit={
            isOwnProfile
              ? (values) => actions.handleEditPost(postId, values)
              : undefined
          }
          isEditPending={actions.updatePostMutation.isPending}
          onPostClick={() => router.push(`/posts/${post.post_id}`)}
          shareUrl={`/posts/${post.post_id}`}
        >
          <Stack gap="md" w="100%">
            {activeCommentPostId === postId ? (
              <LSCommentComposer
                postId={postId}
                onAddComment={actions.handleAddComment}
                isSubmitting={false}
              />
            ) : null}

            {comments.length > 0 ? (
              <>
                <Divider />
                {comments.map((comment) => (
                  <LSPostCommentCard
                    key={comment.id}
                    comment={comment}
                    onLikeClick={() =>
                      actions.handleToggleCommentLike({
                        postId,
                        commentId: comment.id,
                      })
                    }
                    showMenu={false}
                  />
                ))}
              </>
            ) : null}
          </Stack>
        </LSPostCard>
      </li>
    );
  });

  return (
    <Stack p={8} gap="lg">
      <LSProfileHero
        profile={profile!}
        isOwnProfile={isOwnProfile}
        onProfilePicSelect={mediaUpload?.onProfilePicSelect}
        isUploadingProfilePic={mediaUpload?.isUploadingProfilePic}
        onProfileHeaderSelect={mediaUpload?.onProfileHeaderSelect}
        isUploadingProfileHeader={mediaUpload?.isUploadingProfileHeader}
        isFollowing={followProfile?.isFollowing}
        onToggleFollow={followProfile?.onToggleFollow}
        isTogglePending={followProfile?.isTogglePending}
        onMessageClick={onMessageClick}
        isMessagePending={isMessagePending}
        onReportClick={onReportClick}
      />
      <LSMiniProfileList
        widgetTitle="Friends"
        profiles={friends ?? []}
        maxInline={6}
        listGap="lg"
      />
      <LSMiniProfileList
        widgetTitle="Following"
        profiles={notFollowedBack}
        maxInline={6}
        listGap="lg"
      />
      <LSProfileGroupsWidget userId={userId} isOwnProfile={isOwnProfile} />
      <Stack
        component="ul"
        gap="lg"
        w="100%"
        style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}
      >
        {listPosts}
      </Stack>
      {hasNextPage ? (
        <Button
          variant="subtle"
          color="navy"
          size="sm"
          radius="xl"
          onClick={() => userPostsQuery.fetchNextPage()}
          loading={isFetchingNextPage}
        >
          Load more posts
        </Button>
      ) : null}
    </Stack>
  );
};

/** Props for desktop layout — hero + side widgets in a row; posts below divider. */
interface LSProfileDesktopLayoutProps {
  userId: string;
  isOwnProfile: boolean;
  actions: ProfilePostActionsResult;
  followProfile?: FollowProfileHeroProps;
  mediaUpload?: ProfileMediaUploadProps;
  onMessageClick?: () => void;
  isMessagePending?: boolean;
  onReportClick?: () => void;
  currentUserId: string | null;
  initialTab?: Exclude<ProfileTab, "posts">;
  profileAction?: ProfileAction;
}

const MAX_PROFILE_PAGE_WIDTH = 1660; // in pixels
const PROFILE_PAGE_PADDING_X = 190;

/**
 * Desktop profile layout — hero and a column of friends, following, then groups;
 * the post feed renders below a divider at a narrower width.
 *
 * @param userId        - Profile owner's user ID (drives all data queries).
 * @param isOwnProfile  - Whether the viewer owns this profile (controls edit UI).
 * @param actions       - Post-related mutation handlers (like, comment, report).
 * @param editProfile   - Edit-modal state & callbacks for the hero section.
 * @param followProfile - Follow/unfollow state & callback (omitted for own profile).
 * @param mediaUpload   - Profile pic & banner upload handlers (omitted for other users).
 */
const LSProfileDesktopLayout = ({
  userId,
  isOwnProfile,
  actions,
  followProfile,
  mediaUpload,
  onMessageClick,
  isMessagePending,
  onReportClick,
  currentUserId,
  initialTab,
  profileAction,
}: LSProfileDesktopLayoutProps) => {
  const initialProfileTab =
    initialTab ??
    (profileAction === "add-publication"
      ? "publications"
      : profileAction === "add-product"
        ? "products"
        : "posts");
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialProfileTab);
  const profileQuery = useUserProfile(userId);
  const profile = profileQuery.data;
  const username = `${profile?.first_name} ${profile?.last_name}`;
  const userPostsQuery = useUserPosts(userId);
  const posts = userPostsQuery.data?.pages.flatMap((p) => p.posts) ?? [];

  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  );

  const hasNextPage = userPostsQuery.hasNextPage ?? false;
  const isFetchingNextPage = userPostsQuery.isFetchingNextPage ?? false;

  const feedPosts = posts.map((post) => ({
    id: String(post.post_id),
    userId: post.user_id,
    userName: username ?? "Unknown User",
    avatarUrl: profile?.avatar_url ?? undefined,
    scientificField: post.scientific_field ?? post.category ?? "—",
    content: post.text ?? "",
    timeAgo: getTimeAgo(post.created_at),
    mediaUrl: post.media_url ?? null,
    mediaWidth: post.media_width ?? undefined,
    mediaHeight: post.media_height ?? undefined,
    comments: (post.comments ?? []).map((c) => ({
      id: c.id,
      userId: c.userId ?? "",
      userName: c.userName ?? "",
      avatarUrl: c.avatarUrl ?? undefined,
      content: c.content ?? "",
      timeAgo: c.timeAgo,
    })),
    isLiked: post.isLiked ?? false,
    likeCount: post.like_amount ?? 0,
    isSaved: post.isSaved ?? false
  }));
  const setSaved = useSetSavedPost(userId);

  if (profileQuery.status === "pending") {
    return (
      <Flex justify="center" align="center" h="calc(100vh - 120px)">
        <LSSpinner />
      </Flex>
    );
  }
  if (profileQuery.status === "error") {
    return <div> Error loading Profile... </div>;
  }

  return (
    <Stack 
      gap='lg' 
      maw={MAX_PROFILE_PAGE_WIDTH} 
      mx="auto" 
      // On screen shrink, use the x padding first, then clamp at 16px
      px={`clamp(16px, calc((100vw - ${MAX_PROFILE_PAGE_WIDTH - 2 * PROFILE_PAGE_PADDING_X}px) / 2), ${PROFILE_PAGE_PADDING_X}px)`} 
      pt='3vh' 
      pb='200'
    >
      <Flex p={0} direction="row" w="100%" gap={{ base: 24, sm: 0, md: 24 }} align="flex-start">
        <Stack flex={6}>
          {
            profile ?
            <LSProfileHero
              profile={profile}
              isOwnProfile={isOwnProfile}
              onProfilePicSelect={mediaUpload?.onProfilePicSelect}
              isUploadingProfilePic={mediaUpload?.isUploadingProfilePic}
              onProfileHeaderSelect={mediaUpload?.onProfileHeaderSelect}
              isUploadingProfileHeader={mediaUpload?.isUploadingProfileHeader}
              isFollowing={followProfile?.isFollowing}
              onToggleFollow={followProfile?.onToggleFollow}
              isTogglePending={followProfile?.isTogglePending}
              onMessageClick={onMessageClick}
              isMessagePending={isMessagePending}
              onReportClick={onReportClick}
            /> 
            : 
            <>No profile found for this user...</>
          }
          <Tabs
            value={activeTab}
            onChange={(value) => {
              if (
                value === "posts" ||
                value === "publications" ||
                value === "grants" ||
                value === "products" ||
                value === "bookmarks"
              ) {
                setActiveTab(value);
              }
            }}
            activateTabWithKeyboard={false}
            styles={{
              panel: {
                display: "flex",
                justifyContent: "center",
              },
              list: {
                border: "1px solid var(--mantine-color-gray-3)",
                borderRadius: "var(--mantine-radius-md)",
                outline: 'none',
                paddingLeft: '16px',
                paddingRight: '16px',
                boxShadow: "var(--mantine-shadow-xs)"
              },
              tab: {
                padding: "0px 10px 0px 10px",
              },
              tabLabel: {
                padding: "10px 0px 10px 0px",
                fontWeight: '600'
              }
            }}
            classNames={classes}
            w='100%'
          >
            <Tabs.List mb={20} justify="start" bg='gray.0'>
              <Tabs.Tab value="posts">Posts</Tabs.Tab>
              <Tabs.Tab value="publications">Publications</Tabs.Tab>
              <Tabs.Tab value="grants">Grants</Tabs.Tab>
              <Tabs.Tab value="products">Research Products</Tabs.Tab>
              {
                isOwnProfile &&
                <Tabs.Tab value="bookmarks">Saved</Tabs.Tab>
              }
            </Tabs.List>

            <Tabs.Panel value="posts">
              <Stack w="100%" maw="600">
                <Stack
                  component="ul"
                  gap="lg"
                  w="100%"
                  style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}
                >
                  {feedPosts.map((post) => (
                    <FeedPostCard
                      key={post.id}
                      post={post}
                      currentUserId={currentUserId}
                      commentOpen={activeCommentPostId === post.id}
                      onToggleComments={() =>
                        setActiveCommentPostId((c) => (c === post.id ? null : post.id))
                      }
                      onAddComment={async (postId, values) => await actions.handleAddComment(postId, values)}
                      onLike={() => actions.handleTogglePostLike(post.id)}
                      onDelete={() => actions.handleDeletePost(post.id)}
                      onSetSaved={(postId, save) => setSaved.mutate({ postId, save })}
                      hideYourPostBadge
                    />
                  ))}
                </Stack>
                {hasNextPage ? (
                  <Button
                    variant="subtle"
                    color="navy"
                    size="sm"
                    radius="xl"
                    onClick={() => userPostsQuery.fetchNextPage()}
                    loading={isFetchingNextPage}
                  >
                    Load more posts
                  </Button>
                ) : 
                feedPosts.length === 0 && 
                <Stack justify='center' align='center'>
                  <IconMessageCircleOff color='var(--mantine-color-dimmed)' size={64} stroke={1}/>
                  <Text ta='center' c='dimmed'>
                    No Posts Found...
                  </Text>
                </Stack>
              }
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value='publications'>
              <LSPublicationsList
                userId={userId}
                autoOpenOrcid={isOwnProfile && profileAction === "add-publication"}
              />
            </Tabs.Panel>

            <Tabs.Panel value='grants'>
              <LSGrantsList userId={userId} />
            </Tabs.Panel>

            <Tabs.Panel value='products'>
              <LSProductsList
                userId={userId}
                autoOpenAddProduct={isOwnProfile && profileAction === "add-product"}
              />
            </Tabs.Panel>

            <Tabs.Panel value='bookmarks'>
              <LSBookmarksTab userId={userId}/>
            </Tabs.Panel>

          </Tabs>
        </Stack>

        <StickyBox offsetTop={60 + 26} offsetBottom={16}>
          <Stack w={300} gap="lg" miw={0} maw="100%" visibleFrom="md">
            <LSProfileGroupsWidget
              userId={userId}
              isOwnProfile={isOwnProfile}
            />
            {
              isOwnProfile &&
              <RecommendedCollabsCard currentUserId={userId}/>
            }
          </Stack>
        </StickyBox>
      </Flex>
    </Stack>
  );
};

/**
 * Full profile page view: hero, friends/following widgets, and post feed.
 * Client component; all data and mutation logic comes from useLSProfileView.
 * Renders LSProfileMobileLayout or LSProfileDesktopLayout based on useIsMobile().
 */
export function LSProfileView(props: LSProfileViewProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const createChatMutation = useCreateChat();
  const { actions, followProfile, mediaUpload } =
    useLSProfileView(props);

  const [reportOverlayOpen, setReportOverlayOpen] = useState(false);

  const profileQuery = useUserProfile(props.userId);
  const profile = profileQuery.data;
  const profileName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : "Unknown User";
  const handleMessageClick = props.isOwnProfile
    ? undefined
    : () => {
        if (!props.currentUserId) {
          notifications.show({
            title: "Sign in required",
            message: "Please sign in to send a message.",
            color: "red",
          });
          return;
        }

        createChatMutation.mutate([props.userId], {
          onSuccess: (result) => {
            const conversationId = result.data?.conversation_id;
            if (result.success && conversationId) {
              router.push(`/chat/${conversationId}`);
              return;
            }

            notifications.show({
              title: "Could not open chat",
              message: result.error ?? "Please try again.",
              color: "red",
            });
          },
          onError: (error: unknown) => {
            notifications.show({
              title: "Could not open chat",
              message:
                error instanceof Error ? error.message : "Please try again.",
              color: "red",
            });
          },
        });
      };

  return (
    <Box mih="calc(100vh - 56px)">
      {!props.isOwnProfile && (
        <LSUserReportOverlay
          open={reportOverlayOpen}
          targetUserId={props.userId}
          targetUserName={profileName}
          onClose={() => setReportOverlayOpen(false)}
        />
      )}
      {isMobile ? (
        <LSProfileMobileLayout
          userId={props.userId}
          isOwnProfile={props.isOwnProfile}
          actions={actions}
          followProfile={followProfile}
          mediaUpload={mediaUpload}
          onMessageClick={handleMessageClick}
          isMessagePending={createChatMutation.isPending}
          onReportClick={() => setReportOverlayOpen(true)}
        />
      ) : (
        <LSProfileDesktopLayout
          userId={props.userId}
          isOwnProfile={props.isOwnProfile}
          actions={actions}
          followProfile={followProfile}
          mediaUpload={mediaUpload}
          onMessageClick={handleMessageClick}
          isMessagePending={createChatMutation.isPending}
          onReportClick={() => setReportOverlayOpen(true)}
          currentUserId={props.currentUserId}
          initialTab={props.initialTab}
          profileAction={props.profileAction}
        />
      )}
    </Box>
  );
}
