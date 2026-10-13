"use client";

import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Drawer,
  Flex,
  Group,
  Loader,
  Modal,
  NavLink,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconMenu2, IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/app/use-is-mobile";
import {
  useCreateChat,
  useGetChatsWithPreview,
} from "@/components/chat/use-chat";
import type { ChatPreview } from "@/lib/actions/chat";
import { searchForUsers } from "@/lib/actions/data";
import type { User } from "@/lib/types/feed";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const activeChatId = useMemo(() => {
    const match = pathname.match(/^\/chat\/(\d+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const [drawerOpened, setDrawerOpened] = useState(false);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced] = useDebouncedValue(query, 300);
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  const createChatMutation = useCreateChat();
  const { data: chatsData, isLoading } = useGetChatsWithPreview();
  const chats = chatsData?.data ?? [];

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }

    let isMounted = true;
    setSearching(true);

    searchForUsers({ query: debounced }).then((res) => {
      if (!isMounted) return;
      setResults(res.success ? (res.data ?? []) : []);
      setSearching(false);
    });

    return () => {
      isMounted = false;
    };
  }, [debounced]);

  useEffect(() => {
    if (isMobile) {
      if (!activeChatId) {
        setDrawerOpened(true);
      } else {
        setDrawerOpened(false);
      }
    }
  }, [isMobile, activeChatId]);

  const sidebarContent = (
    <Stack gap="md" p="md">
      <Card
        radius="md"
        p="lg"
        withBorder
      >
        <Stack gap="md">
          <Box>
            <Title order={3} c="var(--ls-text-strong)">
              Chats
            </Title>
            <Text size="sm" c="var(--ls-text-muted)">
              Your active conversations across researchers and groups.
            </Text>
          </Box>
          <Button
            radius="md"
            leftSection={<IconPlus size={14} />}
            onClick={() => {
              setNewChatModalOpen(true);
              setDrawerOpened(false);
            }}
          >
            New Chat
          </Button>
        </Stack>
      </Card>

      <ScrollArea h="100%">
        <Stack gap="sm">
          {isLoading ? (
            <Center h={100}>
              <Loader size="sm" />
            </Center>
          ) : chats.length === 0 ? (
            <Card
              radius="xl"
              p="lg"
              withBorder
              bg="var(--ls-surface)"
              style={{ borderColor: "var(--ls-border)" }}
            >
              <Text size="sm" c="var(--ls-text-muted)">
                No chats yet. Start a conversation!
              </Text>
            </Card>
          ) : (
            chats.map((chat) => (
              <NavLink
                key={chat.conversation_id}
                component={Link}
                href={`/chat/${chat.conversation_id}`}
                active={chat.conversation_id + "" === activeChatId}
                p="md"
                style={{
                  border:
                    chat.conversation_id + "" === activeChatId
                      ? "1px solid var(--ls-tint-border)"
                      : "1px solid var(--ls-border)",
                  background:
                    chat.conversation_id + "" === activeChatId
                      ? "var(--ls-tint-bg)"
                      : "var(--ls-surface)",
                  borderRadius: 'var(--mantine-radius-md)',
                  boxShadow:
                    chat.conversation_id + "" === activeChatId
                      ? "3px 3px 10px rgba(37,99,235,0.12)"
                      : "0 1px 4px rgba(0,0,0,0.04)",
                }}
                label={
                  <Text fw={600} truncate>
                    {chat.name || `Chat #${chat.conversation_id}`}
                  </Text>
                }
                description={
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {(chat.message?.content as string) || "No messages yet"}
                  </Text>
                }
                leftSection={
                  <Avatar
                    radius="xl"
                    size="md"
                    src={chat.profile_pic_url}
                  />
                }
                rightSection={
                  (chat.unread_count ?? 0) > 0 &&
                  chat.conversation_id + "" !== activeChatId ? (
                    <Badge size="sm" color="blue" variant="filled">
                      {(chat.unread_count ?? 0) > 99
                        ? "99+"
                        : chat.unread_count}
                    </Badge>
                  ) : null
                }
                onClick={() => setDrawerOpened(false)}
              />
            ))
          )}
        </Stack>
      </ScrollArea>
    </Stack>
  );

  return (
    <>
      {isMobile ? (
        <>
          <Drawer
            opened={drawerOpened}
            onClose={() => setDrawerOpened(false)}
            padding={0}
            size="100%"
            title=""
            transitionProps={{ duration: 0 }}
          >
            {sidebarContent}
          </Drawer>

          <Flex
            direction="column"
            h="calc(100dvh - 60px - 60px)"
            style={{
              overflow: "hidden",
              background: "var(--ls-chat-bg)",
            }}
          >
            <Box p="xs" style={{ flexShrink: 0 }}>
              <Button
                variant="subtle"
                size="compact-sm"
                leftSection={<IconMenu2 size={18} />}
                onClick={() => setDrawerOpened(true)}
                c="var(--ls-text-strong)"
              >
                Chats
              </Button>
            </Box>

            <Box flex={1} style={{ overflow: "hidden" }}>
              {children}
            </Box>
          </Flex>
        </>
      ) : (
        <Flex
          h="calc(100vh - 60px)"
          style={{
            overflow: "hidden",
            background: "var(--ls-chat-bg)",
          }}
        >
          <Paper
            w={320}
            miw={320}
            radius={0}
            h="100%"
            bg="var(--ls-chat-rail-bg)"
            style={{
              borderRight: "1px solid var(--mantine-color-gray-3)",
            }}
          >
            {sidebarContent}
          </Paper>

          <Box flex={1} h="100%" style={{ overflow: "hidden" }}>
            {children}
          </Box>
        </Flex>
      )}

      <Modal
        opened={newChatModalOpen}
        onClose={() => {
          setNewChatModalOpen(false);
          setQuery("");
          setSelectedUsers([]);
        }}
        title={
          <Title order={4} c="var(--ls-text-strong)">
            New Conversation
          </Title>
        }
        centered
      >
        <Stack gap="md">
          <TextInput
            placeholder="Search by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            radius="xl"
            size="md"
            styles={{ input: { borderColor: "var(--ls-border)" } }}
          />

          {searching && (
            <Center>
              <Loader size="sm" />
            </Center>
          )}

          {results.length > 0 && (
            <Stack gap={0}>
              {results.map((user) => {
                const isSelected = selectedUsers.some(
                  (u) => u.user_id === user.user_id,
                );

                return (
                  <NavLink
                    key={user.user_id}
                    label={
                      <Text fw={600} c="var(--ls-text-strong)">
                        {user.first_name} {user.last_name}
                      </Text>
                    }
                    leftSection={
                      <Avatar
                        radius="xl"
                        size="md"
                        color="blue"
                        bg="var(--ls-brand)"
                        src={user.avatar_url}
                      />
                    }
                    active={isSelected}
                    styles={{
                      root: {
                        "--nav-active-bg": "var(--mantine-color-navy-3)",
                      },
                    }}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedUsers((current) =>
                          current.filter((u) => u.user_id !== user.user_id),
                        );
                      } else {
                        setSelectedUsers((current) => [...current, user]);
                      }
                    }}
                    style={{ borderRadius: 8 }}
                  />
                );
              })}
            </Stack>
          )}

          {query.trim() && !searching && results.length === 0 && (
            <Text size="sm" c="dimmed" ta="center">
              No users found
            </Text>
          )}

          <Button
            fullWidth
            variant="filled"
            radius="xl"
            loading={createChatMutation.isPending}
            disabled={selectedUsers.length === 0}
            onClick={() =>
              createChatMutation.mutate(
                selectedUsers.map((u) => u.user_id),
                {
                  onSuccess: () => {
                    setNewChatModalOpen(false);
                    setQuery("");
                    setSelectedUsers([]);
                  },
                },
              )
            }
          >
            Start Chat
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
