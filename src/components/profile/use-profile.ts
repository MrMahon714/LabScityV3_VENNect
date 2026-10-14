import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/use-auth";
import { getUser, getUserPosts } from "@/lib/actions/data";
import { getProfileVisibleGroups } from "@/lib/actions/groups";
import {
  getUserFollowers,
  getUserFollowing,
  getUserFriends,
  updateDeclaredTagsAction,
  updateProfileSkills,
} from "@/lib/actions/profile";
import { profileKeys } from "@/lib/query-keys";
import { UpdateDeclaredTagsValues, UpdateSkillsValues } from "@/lib/validations/profile";
import { notifications } from "@mantine/notifications";

// NOTE: Profile hooks now return the full React Query result objects
// so server prefetch and client usage share the same data shape.

/**
 * Fetches a single user profile. Uses profileKeys.user(user_id); same key as server prefetch.
 *
 * @param user_id - Profile owner's user ID.
 * @param options - Optional { enabled } to pause the query.
 * @returns Full React Query result (data, status, error, etc.).
 */
export function useUserProfile(
  user_id: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: profileKeys.user(user_id),
    queryFn: async () => {
      const result = await getUser(user_id);
      if (!result?.success || !result.data) {
        throw new Error(result?.error ?? "Failed to fetch user profile");
      }
      return result.data;
    },
    ...options,
  });
}

const PROFILE_POSTS_PAGE_SIZE = 10;

/**
 * Fetches profile posts with cursor-based pagination. Uses profileKeys.posts(user_id).
 *
 * @param user_id - Profile owner's user ID.
 * @returns Infinite query result (data.pages, hasNextPage, fetchNextPage, etc.).
 */
export function useUserPosts(user_id: string) {
  return useInfiniteQuery({
    queryKey: profileKeys.posts(user_id),
    queryFn: async ({ pageParam }) => {
      const result = await getUserPosts({
        user_id,
        cursor: pageParam,
        limit: PROFILE_POSTS_PAGE_SIZE,
      });
      if (!result.success || !result.data) {
        throw new Error(result.error ?? "Failed to fetch user posts");
      }
      return result.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
  });
}

/**
 * Fetches the list of users who follow the given user. Uses profileKeys.followers(user_id).
 *
 * @param user_id - Profile owner's user ID.
 * @returns Full React Query result with User[] on success.
 */
export function useUserFollowers(user_id: string) {
  return useQuery({
    queryKey: profileKeys.followers(user_id),
    queryFn: async () => {
      const result = await getUserFollowers(user_id);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? "Failed to fetch user followers");
      }
      return result.data;
    },
  });
}

/**
 * Fetches the list of users that the given user follows. Uses profileKeys.following(user_id).
 *
 * @param user_id - Profile owner's user ID.
 * @returns Full React Query result with User[] on success.
 */
export function useUserFollowing(user_id: string) {
  return useQuery({
    queryKey: profileKeys.following(user_id),
    queryFn: async () => {
      const result = await getUserFollowing(user_id);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? "Failed to fetch user following");
      }
      return result.data;
    },
  });
}

/**
 * Fetches the given user's friends list. Uses profileKeys.friends(user_id).
 *
 * @param user_id - Profile owner's user ID.
 * @returns Full React Query result with User[] on success.
 */
export function useUserFriends(
  user_id: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: profileKeys.friends(user_id),
    queryFn: async () => {
      const result = await getUserFriends(user_id);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? "Failed to fetch user friends");
      }
      return result.data;
    },
    enabled: Boolean(user_id) && (options?.enabled ?? true),
  });
}

/**
 * Groups the profile user belongs to (public-only when viewing others; full list on own profile).
 * Requires sign-in; stays idle when logged out.
 */
export function useProfileGroups(profileUserId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: profileKeys.groups(profileUserId),
    queryFn: async () => {
      const result = await getProfileVisibleGroups(profileUserId);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? "Failed to fetch groups");
      }
      return result.data;
    },
    enabled: Boolean(user?.id && profileUserId),
  });
}

export function useUpdateProfileSkills(userId: string, onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: UpdateSkillsValues) => {
      const res = await updateProfileSkills(values);
      if (!res.success) throw new Error(res.error ?? "Failed to update skills");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.user(userId) });
      // TODO: Add CMA keys here too
      onSuccess?.();
    },
    onError: (err) =>
      notifications.show({
        title: "Could not update skills",
        message: err instanceof Error ? err.message : "Something went wrong",
        color: "red",
      }),
  });
}

export function useUpdateDeclaredTags(userId: string, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: UpdateDeclaredTagsValues) => {
      const res = await updateDeclaredTagsAction(values);
      if (!res.success) throw new Error(res.error ?? "Failed to update research areas");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.user(userId) });
      // TODO: Add CMA keys here too
      onSuccess?.();
    },
    onError: (err) =>
      notifications.show({
        title: "Could not update research areas",
        message: err instanceof Error ? err.message : "Something went wrong",
        color: "red",
      }),
  });
}

export function useExtractResume() {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/profile/extract-resume", {
        method: "POST",
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json.error ?? "Failed to extract resume");
      }
      return json;
    },
    onError: (err) =>
      notifications.show({
        title: "Could not extract resume",
        message: err instanceof Error ? err.message : "Something went wrong",
        color: "red",
      }),
  });
}

export function useConfirmExtractedData(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { skills: string[]; researchAreas: string[] }) => {
      const skillsRes = await updateProfileSkills({
        skills: data.skills.map((name) => ({ id: null, name })),
      });
      if (!skillsRes.success) throw new Error(skillsRes.error ?? "Failed to update skills");

      const tagsRes = await updateDeclaredTagsAction({
        tags: data.researchAreas.map((name) => ({ id: null, name })),
      });
      if (!tagsRes.success) throw new Error(tagsRes.error ?? "Failed to update research areas");

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.user(userId) });
      notifications.show({
        title: "Resume extracted successfully",
        message: "Skills and research areas have been updated",
        color: "green",
      });
    },
    onError: (err) =>
      notifications.show({
        title: "Could not update profile",
        message: err instanceof Error ? err.message : "Something went wrong",
        color: "red",
      }),
  });
}