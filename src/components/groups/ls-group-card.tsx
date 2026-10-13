"use client";

import { Avatar, Badge, Button, Card, Group, Stack, Text } from "@mantine/core";
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
      radius="xl"
      p="lg"
      h="100%"
      bg="var(--ls-surface)"
      styles={{
        root: {
          borderColor: "var(--ls-border)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          transition: "box-shadow 160ms ease, transform 160ms ease",
          "&:hover": {
            boxShadow: "0 16px 36px rgba(15,23,42,0.08)",
            transform: "translateY(-2px)",
          },
        },
      }}
    >
      <Stack gap="sm" justify="space-between" h="100%">
        <Stack gap="xs">
          <Group gap="sm" align="center" wrap="nowrap">
            <Avatar
              size={48}
              radius="xl"
              color="blue"
              bg={group.avatar_url ? undefined : "var(--ls-brand)"}
              src={group.avatar_url ?? undefined}
            >
              {cardInitials(group.name)}
            </Avatar>
            <Text
              fw={700}
              size="lg"
              c="var(--ls-text-strong)"
              lineClamp={2}
              style={{ flex: 1 }}
            >
              {group.name}
            </Text>
          </Group>
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
              radius="xl"
              onClick={() => onView(group.group_id)}
            >
              View
            </Button>
          ) : (
            <Button
              fullWidth
              radius="xl"
              loading={isJoining}
              style={{ background: "var(--ls-brand)" }}
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
