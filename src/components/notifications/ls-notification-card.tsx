import {
  ActionIcon,
  Anchor,
  Avatar,
  Box,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconBell,
  IconCircleFilled,
  IconHeartFilled,
  IconMessageCircleFilled,
  IconMessageFilled,
  IconUserFilled,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { initials } from "../feed/post-detail-card.utils";
import { parsePostContent } from "@/lib/utils/post-content";
import { useNotificationStore } from "@/store/notificationStore";

const NOTIFICATION_TEMPLATES: Record<string, (actor: ReactNode) => ReactNode> =
  {
    new_follow: (actor) => <>{actor} started following you</>,
    post_like: (actor) => <>{actor} liked your post</>,
    new_comment: (actor) => <>{actor} commented on your post</>,
  };

function getNotificationIcon(type: string) {
  switch (type) {
    case "post_like":
      return IconHeartFilled;
    case "new_comment":
      return IconMessageCircleFilled;
    case "new_follow":
      return IconUserFilled;
    case "group_invite":
      return IconUsers;
    case "new_message":
      return IconMessageFilled;
    default:
      return IconBell;
  }
}

function getNotificationIconColor(type: string) {
  return type === "post_like"
    ? "var(--mantine-color-red-6)"
    : "var(--ls-text-strong)";
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function LSNotificationCard({
  notification,
  isNew,
  onDismiss,
}: {
  notification: ReturnType<
    typeof useNotificationStore.getState
  >["notifications"][number];
  isNew: boolean;
  onDismiss: (id: string) => void;
}) {
  const Icon = getNotificationIcon(notification.type);
  const iconColor = getNotificationIconColor(notification.type);

  const template = NOTIFICATION_TEMPLATES[notification.type];
  const isActorBased = Boolean(template);

  const actorName =
    `${notification.actor?.first_name ?? ""} ${
      notification.actor?.last_name ?? ""
    }`.trim() || "Someone";
  const actorProfileLink = `/profile/${notification.actor?.user_id}`;

  const subjectTitle = notification.subject?.text
    ? parsePostContent(notification.subject.text).title
    : null;

  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      pr={64}
      pos="relative"
      bg="var(--ls-surface)"
      style={
        isNew
          ? { borderColor: "var(--ls-text-strong)", borderWidth: 1.5 }
          : undefined
      }
    >
      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(notification.id)}
        pos="absolute"
        top="50%"
        right={10}
        style={{ transform: "translateY(-50%)" }}
      >
        <IconX />
      </ActionIcon>

      {isActorBased ? (
        <Group align="center" wrap="nowrap" gap="sm">
          <Box pos="relative" style={{ flexShrink: 0 }}>
            <Avatar
              component={Link}
              href={actorProfileLink}
              src={notification.actor?.profile_pic_path ?? undefined}
              radius="xl"
              size={44}
            >
              {initials(actorName)}
            </Avatar>
            <Box
              pos="absolute"
              bottom={-2}
              right={-2}
              bg="var(--ls-surface)"
              p={2}
              style={{ borderRadius: "50%", lineHeight: 0 }}
            >
              <Icon size={14} color={iconColor} />
            </Box>
          </Box>

          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm">
              {template(
                <Anchor
                  component={Link}
                  href={actorProfileLink}
                  fw={600}
                  c="var(--ls-text-strong)"
                >
                  {actorName}
                </Anchor>,
              )}
              <Text span size="xs" c="dimmed">
                {" "}
                · {formatRelativeTime(notification.created_at)}
              </Text>
            </Text>

            {subjectTitle && (
              <Anchor
                component={Link}
                href={notification.link ?? "#"}
                size="xs"
                fw={400}
                c="dimmed"
                lineClamp={1}
              >
                {subjectTitle}
              </Anchor>
            )}
          </Stack>
        </Group>
      ) : (
        <Group align="flex-start" wrap="nowrap" gap="sm">
          <Icon size={24} color={iconColor} style={{ flexShrink: 0 }} />
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm">
              {notification.link ? (
                <Text
                  component={Link}
                  href={notification.link}
                  inherit
                  style={{ textDecoration: "none", cursor: "pointer" }}
                >
                  <Text span fw={600} c="var(--ls-text-strong)">
                    {notification.title}
                    {notification.bundleCount &&
                      notification.bundleCount > 1 && (
                        <Text span c="dimmed">
                          {" "}
                          (+{notification.bundleCount - 1} more)
                        </Text>
                      )}
                  </Text>{" "}
                  {notification.content}
                </Text>
              ) : (
                <Text span fw={600} c="var(--ls-text-strong)">
                  {notification.title} <Text span>{notification.content}</Text>
                </Text>
              )}
            </Text>
            <Text size="xs" c="dimmed">
              {formatRelativeTime(notification.created_at)}
            </Text>
          </Stack>
        </Group>
      )}

      {isNew && (
        <Group gap={4} mt={6}>
          <IconCircleFilled size={8} color="var(--ls-text-strong)" />
          <Text size="xs" c="var(--ls-text-strong)" fw={600}>
            New
          </Text>
        </Group>
      )}
    </Paper>
  );
}