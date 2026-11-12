"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useGetChatsWithPreview,
} from "@/components/chat/use-chat";
import { getGroupsActivity } from "@/lib/actions/groups";
import { groupKeys } from "@/lib/query-keys";
import type { GroupActivityItem, GroupListItem } from "@/lib/types/groups";

const LAST_SEEN_KEY = "ls:groups:last-seen";

function readLastSeen(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(LAST_SEEN_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export interface GroupActivity {
  newPosts: number;
  unreadMessages: number;
  total: number;
  latestPost: GroupActivityItem["latestPost"];
}

/*main area of groups tab rework
works out what is new in each of your groups:
posts by other members since you last opened the group
unread messages in its chat
last-opened times are per browser
 */
export function useGroupActivity(groups: GroupListItem[]) {
  const [lastSeen, setLastSeen] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLastSeen(readLastSeen());
    setReady(true);
  }, []);

  const groupIdsKey = groups
    .map((g) => g.group_id)
    .sort((a, b) => a - b)
    .join(",");

  const postsQuery = useQuery({
    queryKey: groupKeys.activity(groupIdsKey, JSON.stringify(lastSeen)),
    enabled: ready && groups.length > 0,
    refetchInterval: 60_000,
    queryFn: async () => {
      const result = await getGroupsActivity(lastSeen);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? "Failed to load activity");
      }
      return result.data;
    },
  });

  const { data: chatsData } = useGetChatsWithPreview();

  const activityByGroup = useMemo(() => {
    const unreadByConversation = new Map<number, number>();
    for (const chat of chatsData?.data ?? []) {
      unreadByConversation.set(chat.conversation_id, chat.unread_count ?? 0);
    }

    const postsByGroup = new Map<number, GroupActivityItem>();
    for (const item of postsQuery.data ?? []) {
      postsByGroup.set(item.group_id, item);
    }

    const result = new Map<number, GroupActivity>();
    for (const group of groups) {
      const posts = postsByGroup.get(group.group_id);
      const newPosts = posts?.newPostCount ?? 0;
      const unreadMessages = group.conversation_id
        ? (unreadByConversation.get(group.conversation_id) ?? 0)
        : 0;
      result.set(group.group_id, {
        newPosts,
        unreadMessages,
        total: newPosts + unreadMessages,
        latestPost: posts?.latestPost ?? null,
      });
    }
    return result;
  }, [groups, postsQuery.data, chatsData]);

  const markSeen = useCallback((groupId: number) => {
    const next = { ...readLastSeen(), [String(groupId)]: new Date().toISOString() };
    try {
      window.localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(next));
    } catch {
      return;
    }
    setLastSeen(next);
  }, []);

  return { activityByGroup, markSeen, isLoading: !ready || postsQuery.isLoading };
}
