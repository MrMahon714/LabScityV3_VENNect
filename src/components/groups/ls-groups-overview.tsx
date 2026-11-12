"use client";

import {
  Avatar,
  Box,
  Button,
  Center,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconCompass,
  IconMessageCircle,
  IconPlus,
  IconUsersGroup,
} from "@tabler/icons-react";
import Link from "next/link";
import { LSSpinner } from "@/components/ui/ls-spinner";
import type { GroupListItem } from "@/lib/types/groups";
import type { GroupActivity } from "./use-group-activity";
import { groupsPath } from "@/lib/utils/groups-url";

function initials(name: string) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export interface LSGroupsOverviewProps {
  groups: GroupListItem[];
  activityByGroup: Map<number, GroupActivity>;
  isLoading: boolean;
  onCreateGroup: () => void;
  onOpenChat: (conversationId: number) => void;
}

/*landing view of the groups page*/
export function LSGroupsOverview({
  groups,
  activityByGroup,
  isLoading,
  onCreateGroup,
  onOpenChat,
}: LSGroupsOverviewProps) {
  if (isLoading) {
    return (
      <Center py="xl">
        <LSSpinner />
      </Center>
    );
  }

  if (groups.length === 0) {
    return (
      <Center py="xl">
        <Paper
          p="xl"
          radius="md"
          withBorder
          bg="var(--ls-empty-bg)"
          style={{ borderColor: "var(--ls-border)" }}
          maw={460}
        >
          <Stack align="center" gap="sm">
            <ThemeIcon
              size={64}
              radius="xl"
              variant="outline"
              color="navy.7"
              style={{
                color: "var(--ls-text-strong)",
                borderColor: "var(--ls-text-strong)",
              }}
            >
              <IconUsersGroup size={30} />
            </ThemeIcon>
            <Text c="var(--ls-text-strong)" size="xl" fw={700}>
              You haven't joined any groups yet
            </Text>
            <Text c="gray.7" size="sm" ta="center">
              Find a research community that fits your interests, or start your
              own and invite your collaborators.
            </Text>
            <Group gap="xs" mt="xs">
              <Button
                component={Link}
                href={groupsPath({ tab: "discover" })}
                leftSection={<IconCompass size={16} />}
              >
                Discover groups
              </Button>
              <Button
                variant="default"
                leftSection={<IconPlus size={16} />}
                onClick={onCreateGroup}
              >
                Create group
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Center>
    );
  }

  const active = groups
    .filter((g) => (activityByGroup.get(g.group_id)?.total ?? 0) > 0)
    .sort(
      (a, b) =>
        (activityByGroup.get(b.group_id)?.total ?? 0) -
        (activityByGroup.get(a.group_id)?.total ?? 0),
    );

  return (
    <Stack gap="md">
      <Box>
        <Title order={3} c="var(--ls-text-strong)">
          New activity
        </Title>
        <Text size="sm" c="var(--ls-text-muted)">
          Groups with new posts or unread messages
        </Text>
      </Box>

      {active.length === 0 ? (
        <Paper
          p="xl"
          radius="md"
          withBorder
          bg="var(--ls-surface)"
          style={{ borderColor: "var(--ls-border)" }}
        >
          <Stack align="center" gap={4}>
            <Text fw={700} size="lg" c="var(--ls-text-strong)">
              You're all caught up
            </Text>
            <Text size="sm" c="var(--ls-text-muted)" ta="center">
              Nothing new in your groups. Pick one from the left, or find more
              in Discover.
            </Text>
          </Stack>
        </Paper>
      ) : (
        <Stack gap="sm">
          {active.map((group) => {
            const activity = activityByGroup.get(group.group_id);
            if (!activity) return null;
            const summary = [
              activity.newPosts > 0
                ? `${activity.newPosts} new post${activity.newPosts === 1 ? "" : "s"}`
                : null,
              activity.unreadMessages > 0
                ? `${activity.unreadMessages} unread message${activity.unreadMessages === 1 ? "" : "s"}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <Paper
                key={group.group_id}
                p="md"
                radius="md"
                withBorder
                bg="var(--ls-surface)"
                style={{
                  borderColor: "var(--ls-border)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                }}
              >
                <Group wrap="nowrap" align="flex-start" gap="md">
                  <Avatar
                    size={56}
                    radius="md"
                    color="blue"
                    bg={group.avatar_url ? undefined : "var(--ls-brand)"}
                    src={group.avatar_url ?? undefined}
                  >
                    {initials(group.name)}
                  </Avatar>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={700} size="lg" c="var(--ls-text-strong)" truncate>
                      {group.name}
                    </Text>
                    <Text size="sm" fw={600} c="var(--ls-tint-text)">
                      {summary}
                    </Text>
                    {activity.latestPost ? (
                      <Text size="sm" c="var(--ls-text-muted)" lineClamp={2} mt={4}>
                        {activity.latestPost.author_name}:{" "}
                        {activity.latestPost.text} ·{" "}
                        {timeAgo(activity.latestPost.created_at)}
                      </Text>
                    ) : null}
                  </Box>
                  <Stack gap={6}>
                    <Button
                      component={Link}
                      href={groupsPath({ tab: "mine", groupId: group.group_id })}
                      size="compact-md"
                    >
                      View group
                    </Button>
                    {group.conversation_id && activity.unreadMessages > 0 ? (
                      <Button
                        size="compact-md"
                        variant="default"
                        leftSection={<IconMessageCircle size={14} />}
                        onClick={() => onOpenChat(group.conversation_id as number)}
                      >
                        Open chat
                      </Button>
                    ) : null}
                  </Stack>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
