"use client";

import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import type { GroupDiscoverItem } from "@/lib/types/groups";

export interface LSGroupCardProps {
  group: GroupDiscoverItem;
  isMember: boolean;
  isJoining?: boolean;
  onJoin: (groupId: number) => void;
  onView: (groupId: number) => void;
}

const DESC_MAX = 160;

function cardInitials(name: string) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Compact preview card for a public group on the Discover tab.
 */
export function LSGroupCard({
  group,
  isMember,
  isJoining,
  onJoin,
  onView,
}: LSGroupCardProps) {
  const desc =
    group.description.length > DESC_MAX
      ? `${group.description.slice(0, DESC_MAX).trimEnd()}…`
      : group.description;

  return (
    <Card
      withBorder
      shadow="xs"
      radius="md"
      p={0}
      h="100%"
      bg="var(--ls-surface)"
      style={{
        borderColor: "var(--ls-border)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}
    >
      <Box
        h={72}
        style={{
          background:
            "linear-gradient(135deg, var(--ls-brand) 0%, var(--ls-accent) 100%)",
        }}
      />
      <Stack gap="sm" justify="space-between" p="md" pt={0} style={{ flex: 1 }}>
        <Stack gap="xs">
          <Avatar
            size={64}
            radius="md"
            color="blue"
            bg={group.avatar_url ? undefined : "var(--ls-brand)"}
            src={group.avatar_url ?? undefined}
            styles={{ root: { border: "3px solid var(--ls-surface)" } }}
            style={{ marginTop: -32 }}
          >
            {cardInitials(group.name)}
          </Avatar>
          <Box>
            <Text fw={700} size="lg" c="var(--ls-text-strong)" lineClamp={2}>
              {group.name}
            </Text>
            <Text size="xs" c="var(--ls-text-muted)">
              {group.privacy === "public" ? "Public group" : "Private group"}
            </Text>
          </Box>
          {desc ? (
            <Text size="sm" c="var(--ls-text-muted)" lineClamp={4} lh={1.6}>
              {desc}
            </Text>
          ) : null}
          {group.topics.length > 0 ? (
            <Group gap={6} wrap="wrap">
              {group.topics.slice(0, 5).map((t) => (
                <Badge
                  key={t}
                  size="sm"
                  variant="light"
                  style={{
                    background: "var(--ls-tint-bg-2)",
                    color: "var(--ls-tint-text)",
                    border: "1px solid var(--ls-tint-border)",
                  }}
                >
                  {t}
                </Badge>
              ))}
            </Group>
          ) : null}
        </Stack>
        <Group gap="xs" wrap="nowrap" mt="auto">
          {isMember ? (
            <Button
              fullWidth
              radius="md"
              onClick={() => onView(group.group_id)}
            >
              View
            </Button>
          ) : (
            <Button
              fullWidth
              radius="md"
              loading={isJoining}
              onClick={() => onJoin(group.group_id)}
            >
              Join
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
