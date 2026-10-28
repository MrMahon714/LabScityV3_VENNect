"use client";

import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LSSpinner } from "@/components/ui/ls-spinner";
import type {
  getGroups,
  joinGroup,
  searchPublicGroups,
} from "@/lib/actions/groups";
import { groupKeys } from "@/lib/query-keys";
import { groupsPath } from "@/lib/utils/groups-url";
import { IconUsersGroup } from "@tabler/icons-react";

/** Max groups in this strip; API returns the top N by `last_activity_at` (see `searchPublicGroups`). */
const POPULAR_LIMIT = 6;

function stripInitials(name: string) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export interface LSPopularGroupsHomeStripProps {
  searchPublicGroupsAction: typeof searchPublicGroups;
  joinGroupAction: typeof joinGroup;
  getGroupsAction: typeof getGroups;
}

/**
 * Home sidebar: public groups ordered by `groups.last_activity_at` desc (see
 * `searchPublicGroups` with empty query/filters)—i.e. recently active public
 * groups, not a separate popularity score.
 */
export function LSPopularGroupsHomeStrip({
  searchPublicGroupsAction,
  joinGroupAction,
  getGroupsAction,
}: LSPopularGroupsHomeStripProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: myGroups = [] } = useQuery({
    queryKey: groupKeys.list(),
    queryFn: async () => {
      const r = await getGroupsAction();
      if (!r.success || !r.data) {
        throw new Error(r.error ?? "Failed to load your groups");
      }
      return r.data;
    },
  });

  const myGroupIds = new Set(myGroups.map((g) => g.group_id));

  const popularQuery = useQuery({
    queryKey: groupKeys.popular(POPULAR_LIMIT),
    queryFn: async () => {
      const r = await searchPublicGroupsAction({
        query: "",
        topicTags: [],
        limit: POPULAR_LIMIT,
      });
      if (!r.success) {
        throw new Error(r.error ?? "Failed to load groups");
      }
      return (r.data ?? []).slice(0, POPULAR_LIMIT);
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const r = await joinGroupAction(groupId);
      if (!r.success) {
        throw new Error(r.error ?? "Could not join");
      }
      return groupId;
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.list() });
      queryClient.invalidateQueries({ queryKey: groupKeys.all });
      notifications.show({
        title: "Joined group",
        message: "Open it from Groups anytime.",
        color: "green",
      });
      router.push(groupsPath({ tab: "mine", groupId }));
    },
    onError: (err: Error) => {
      notifications.show({
        title: "Could not join",
        message: err.message,
        color: "red",
      });
    },
  });

  if (popularQuery.isLoading) {
    return (
      <Card withBorder shadow="sm" radius="md" p="md" bg="var(--ls-surface)">
        <Center py="sm">
          <Loader />
        </Center>
      </Card>
    );
  }

  if (popularQuery.isError || !popularQuery.data?.length) {
    return null;
  }

  const groups = popularQuery.data.slice(0, POPULAR_LIMIT);

  return (
    <Card shadow="sm" radius="md" p="md" bg="var(--ls-surface)" withBorder>
      <Group justify="space-between" align="center" mb={8}>
        <Group>
          <Box
            w={22}
            h={22}
            bg="var(--ls-icon-badge-bg)"
            style={{
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconUsersGroup size='1rem' color="var(--ls-icon-badge-color)" />
          </Box>
          <Text c="var(--ls-text-strong)" fw={700} size="sm">
            Popular Groups
          </Text>
        </Group>
        <Button
          component={Link}
          href="/groups?tab=discover"
          variant="subtle"
          color="navy"
          size="compact-xs"
        >
          Discover
        </Button>
      </Group>

      <Stack gap={6}>
        {groups.map((g) => {
          const member = myGroupIds.has(g.group_id);
          return (
            <Group key={g.group_id} wrap="nowrap" gap="xs" align="center">
              <Avatar
                size={28}
                radius="md"
                color="navy.7"
                bg={g.avatar_url ? undefined : "navy.7"}
                src={g.avatar_url ?? undefined}
              >
                {stripInitials(g.name)}
              </Avatar>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text fw={600} c="var(--ls-text-strong)" size="sm" lineClamp={1}>
                  {g.name}
                </Text>
                {g.topics.length > 0 ? (
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {g.topics.slice(0, 2).join(" · ")}
                  </Text>
                ) : null}
              </Box>
              {member ? (
                <Button
                  size="compact-xs"
                  color="navy"
                  component={Link}
                  href={groupsPath({ tab: "mine", groupId: g.group_id })}
                >
                  View
                </Button>
              ) : (
                <Button
                  size="compact-xs"
                  color="navy"
                  loading={
                    joinMutation.isPending &&
                    joinMutation.variables === g.group_id
                  }
                  onClick={() => joinMutation.mutate(g.group_id)}
                >
                  Join
                </Button>
              )}
            </Group>
          );
        })}
      </Stack>
    </Card>
  );
}
