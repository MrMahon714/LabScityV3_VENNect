"use client";

import {
  Avatar,
  Box,
  Button,
  Divider,
  Group,
  ScrollArea,
  Loader,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconExternalLink, IconLogout, IconUsersGroup } from "@tabler/icons-react";
import Link from "next/link";

export interface ChatParticipant {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  occupation: string | null;
  workplace: string | null;
  about: string | null;
}

export interface LSChatDetailsPanelProps {
  isGroupChat: boolean;
  title: string;
  participants: ChatParticipant[];
  currentUserId: string | null;
  groupHref?: string | null;
  isLoading: boolean;
  loadFailed: boolean;
  onLeave: () => void;
  isLeaving: boolean;
}

export function participantName(p: ChatParticipant) {
  return (
    `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email || "Researcher"
  );
}

function initials(name: string) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function subtitleFor(p: ChatParticipant) {
  return [p.occupation, p.workplace].filter(Boolean).join(" at ");
}

/**
 *Right column of the chat page
 DMs will show other person's profile
 Group chats will show group members
 */
export function LSChatDetailsPanel({
  isGroupChat,
  title,
  participants,
  currentUserId,
  groupHref,
  isLoading,
  loadFailed,
  onLeave,
  isLeaving,
}: LSChatDetailsPanelProps) {
  const other = participants.find((p) => p.user_id !== currentUserId);

  return (
    <ScrollArea h="100%" type="auto">
      <Stack gap="lg" p="lg">
        {isLoading ? (
          <Stack align="center" py="xl">
            <Loader size="sm" />
          </Stack>
        ) : loadFailed ? (
          <Text size="sm" c="var(--ls-text-muted)" ta="center">
            Couldn't load this chat's details.
          </Text>
        ) : !isGroupChat && other ? (
          <>
            <Stack align="center" gap="xs">
              <Avatar
                size={96}
                radius="50%"
                src={other.avatar_url ?? undefined}
              >
                {initials(participantName(other))}
              </Avatar>
              <Title order={4} c="var(--ls-text-strong)" ta="center">
                {participantName(other)}
              </Title>
              {subtitleFor(other) ? (
                <Text size="sm" c="var(--ls-text-muted)" ta="center">
                  {subtitleFor(other)}
                </Text>
              ) : null}
            </Stack>

            {other.about ? (
              <Box>
                <Text size="xs" fw={700} tt="uppercase" c="var(--ls-text-muted)" mb={4}>
                  About
                </Text>
                <Text size="sm" c="var(--ls-text-body)" lh={1.6} lineClamp={8}>
                  {other.about}
                </Text>
              </Box>
            ) : null}

            <Button
              component={Link}
              href={`/profile/${other.user_id}`}
              fullWidth
              radius="xl"
              leftSection={<IconExternalLink size={16} />}
            >
              View profile
            </Button>
          </>
        ) : (
          <>
            <Stack align="center" gap="xs">
              <Avatar size={72} radius="50%" color="blue" bg="var(--ls-brand)">
                <IconUsersGroup size={34} />
              </Avatar>
              <Title order={4} c="var(--ls-text-strong)" ta="center">
                {title}
              </Title>
              <Text size="sm" c="var(--ls-text-muted)">
                {participants.length} member{participants.length === 1 ? "" : "s"}
              </Text>
            </Stack>

            {groupHref ? (
              <Button
                component={Link}
                href={groupHref}
                fullWidth
                radius="xl"
                variant="outline"
                leftSection={<IconUsersGroup size={16} />}
              >
                View group
              </Button>
            ) : null}

            <Box>
              <Text size="xs" fw={700} tt="uppercase" c="var(--ls-text-muted)" mb={6}>
                Members
              </Text>
              <Stack gap={2}>
                {participants.map((p) => {
                  const name = participantName(p);
                  return (
                    <UnstyledButton
                      key={p.user_id}
                      component={Link}
                      href={`/profile/${p.user_id}`}
                      py={6}
                      px="xs"
                      style={{ borderRadius: "var(--mantine-radius-md)" }}
                    >
                      <Group gap="sm" wrap="nowrap">
                        <Avatar
                          size="md"
                          radius="xl"
                          src={p.avatar_url ?? undefined}
                        >
                          {initials(name)}
                        </Avatar>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" fw={600} c="var(--ls-text-strong)" truncate>
                            {name}
                            {p.user_id === currentUserId ? " (you)" : ""}
                          </Text>
                          {subtitleFor(p) ? (
                            <Text size="xs" c="var(--ls-text-muted)" truncate>
                              {subtitleFor(p)}
                            </Text>
                          ) : null}
                        </Box>
                      </Group>
                    </UnstyledButton>
                  );
                })}
              </Stack>
            </Box>

            <Divider color="var(--ls-border)" />

            <Text size="xs" c="var(--ls-text-muted)" ta="center">
              This chat belongs to the group. Leave the group to leave the
              chat.
            </Text>
          </>
        )}

        {!isGroupChat && !isLoading && !loadFailed ? (
          <Button
            fullWidth
            color="red"
            variant="light"
            radius="xl"
            leftSection={<IconLogout size={16} />}
            loading={isLeaving}
            onClick={onLeave}
          >
            Leave chat
          </Button>
        ) : null}
      </Stack>
    </ScrollArea>
  );
}
