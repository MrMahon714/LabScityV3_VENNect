"use client";

import {
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  useGetChatsWithPreview,
  useMyGroupsList,
} from "@/components/chat/use-chat";

function initials(name: string) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      size="xs"
      fw={700}
      tt="uppercase"
      c="var(--ls-text-muted)"
      px="xs"
      pt="md"
      pb={4}
      style={{ letterSpacing: "0.06em" }}
    >
      {children}
    </Text>
  );
}

function RowShell({
  active,
  children,
}: {
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box
      px="xs"
      py={6}
      style={{
        borderRadius: "var(--mantine-radius-md)",
        border: active
          ? "1px solid var(--ls-tint-border)"
          : "1px solid transparent",
        background: active ? "var(--ls-tint-bg)" : "transparent",
        transition: "background 120ms ease",
      }}
    >
      {children}
    </Box>
  );
}

interface RowProps {
  avatar: React.ReactNode;
  title: string;
  subtitle?: string | null;
  unread?: number;
  active?: boolean;
}

function RowContent({ avatar, title, subtitle, unread = 0 }: RowProps) {
  return (
    <Group gap="sm" wrap="nowrap">
      {avatar}
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" fw={600} c="var(--ls-text-strong)" truncate>
          {title}
        </Text>
        {subtitle ? (
          <Text size="xs" c="var(--ls-text-muted)" truncate>
            {subtitle}
          </Text>
        ) : null}
      </Box>
      {unread > 0 ? (
        <Badge size="sm" variant="filled">
          {unread > 99 ? "99+" : unread}
        </Badge>
      ) : null}
    </Group>
  );
}

export interface LSChatSidebarProps {
  activeChatId: string | null;
  onNewMessage: () => void;
  onNavigate?: () => void;
}

/**
 * Left column of the messages page:
 * First is new message button
 * Then are DMs
 * Then are group chats
 */
export function LSChatSidebar({
  activeChatId,
  onNewMessage,
  onNavigate,
}: LSChatSidebarProps) {
  const groupsQuery = useMyGroupsList();
  const { data: chatsData, isLoading: chatsLoading } = useGetChatsWithPreview();

  const chats = chatsData?.data ?? [];
  const groups = useMemo(
    () => (groupsQuery.data ?? []).filter((g) => g.conversation_id != null),
    [groupsQuery.data],
  );

  const groupConversationIds = useMemo(
    () => new Set(groups.map((g) => g.conversation_id as number)),
    [groups],
  );

  const chatByConversation = useMemo(() => {
    const map = new Map<number, (typeof chats)[number]>();
    for (const chat of chats) map.set(chat.conversation_id, chat);
    return map;
  }, [chats]);

  const directMessages = useMemo(
    () => chats.filter((c) => !groupConversationIds.has(c.conversation_id)),
    [chats, groupConversationIds],
  );

  return (
    <Stack gap={0} h="100%">
      <Stack gap="sm" p="md" pb="xs">
        <Title order={3} c="var(--ls-text-strong)">
          Messages
        </Title>
        <Button
          fullWidth
          radius="md"
          leftSection={<IconPlus size={14} />}
          onClick={onNewMessage}
        >
          New Message
        </Button>
      </Stack>

      <ScrollArea.Autosize mah="calc(100vh - 60px - 118px)" type="auto" px="sm">
        <Stack gap={2} pb="md">
          <SectionLabel>Direct messages</SectionLabel>
          {chatsLoading ? (
            <Center h={80}>
              <Loader size="sm" />
            </Center>
          ) : directMessages.length === 0 ? (
            <Center py="lg">
              <Stack gap={2} align="center">
                <Text size="sm" fw={600} c="var(--ls-text-strong)">
                  No messages
                </Text>
                <Text size="xs" c="var(--ls-text-muted)" ta="center">
                  Use New Message to start a conversation.
                </Text>
              </Stack>
            </Center>
          ) : (
            directMessages.map((chat) => {
              const active = `${chat.conversation_id}` === activeChatId;
              const name = chat.name || "Conversation";
              return (
                <UnstyledButton
                  key={chat.conversation_id}
                  component={Link}
                  href={`/chat/${chat.conversation_id}`}
                  onClick={() => onNavigate?.()}
                  w="100%"
                >
                  <RowShell active={active}>
                    <RowContent
                      avatar={
                        <Avatar
                          size="md"
                          radius="xl"
                          src={chat.profile_pic_url}
                        >
                          {initials(name)}
                        </Avatar>
                      }
                      title={name}
                      subtitle={
                        (chat.message?.content as string) || "No messages yet"
                      }
                      unread={active ? 0 : (chat.unread_count ?? 0)}
                    />
                  </RowShell>
                </UnstyledButton>
              );
            })
          )}

          <SectionLabel>Group messages</SectionLabel>
          {groupsQuery.isLoading ? (
            <Center h={48}>
              <Loader size="xs" />
            </Center>
          ) : groups.length === 0 ? (
            <Text size="xs" c="var(--ls-text-muted)" px="xs">
              Join or create a group and its chat will show up here.
            </Text>
          ) : (
            groups.map((group) => {
              const conversationId = group.conversation_id as number;
              const active = `${conversationId}` === activeChatId;
              const preview = chatByConversation.get(conversationId);
              return (
                <UnstyledButton
                  key={group.group_id}
                  component={Link}
                  href={`/chat/${conversationId}`}
                  onClick={() => onNavigate?.()}
                  w="100%"
                >
                  <RowShell active={active}>
                    <RowContent
                      avatar={
                        <Avatar
                          size="md"
                          radius="xl"
                          color="blue"
                          bg={group.avatar_url ? undefined : "var(--ls-brand)"}
                          src={group.avatar_url ?? undefined}
                        >
                          {initials(group.name)}
                        </Avatar>
                      }
                      title={group.name}
                      subtitle={
                        (preview?.message?.content as string) ||
                        `${group.memberCount} member${group.memberCount === 1 ? "" : "s"}`
                      }
                      unread={active ? 0 : (preview?.unread_count ?? 0)}
                    />
                  </RowShell>
                </UnstyledButton>
              );
            })
          )}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}
