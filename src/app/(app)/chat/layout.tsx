"use client";

import {
  Avatar,
  Box,
  Button,
  Center,
  Drawer,
  Flex,
  Loader,
  Modal,
  NavLink,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconMenu2 } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/app/use-is-mobile";
import { useAuth } from "@/components/auth/use-auth";
import { LSChatSidebar } from "@/components/chat/ls-chat-sidebar";
import { useFindOrCreateDirectChat } from "@/components/chat/use-chat";
import { chatKeys } from "@/lib/query-keys";
import { createClient } from "@/supabase/client";
import { searchForUsers } from "@/lib/actions/data";
import type { User } from "@/lib/types/feed";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
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

  const directChatMutation = useFindOrCreateDirectChat();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentUser?.id) return;

    const supabase = createClient();
    const refreshSidebar = () =>
      queryClient.invalidateQueries({ queryKey: chatKeys.chatsWithPreview() });

    const channel = supabase
      .channel(`chat-sidebar-${currentUser.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        refreshSidebar,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${currentUser.id}`,
        },
        refreshSidebar,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, queryClient]);

  const closeNewMessage = () => {
    setNewChatModalOpen(false);
    setQuery("");
    setResults([]);
  };

  const handleStartDirectChat = (userId: string) => {
    directChatMutation.mutate(userId, {
      onSuccess: (result) => {
        if (result.success && result.data?.conversation_id) {
          closeNewMessage();
          router.push(`/chat/${result.data.conversation_id}`);
        } else {
          notifications.show({
            title: "Could not open chat",
            message: result.error ?? "Please try again",
            color: "red",
          });
        }
      },
    });
  };

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }

    let isMounted = true;
    setSearching(true);

    searchForUsers({ query: debounced }).then((res) => {
      if (!isMounted) return;
      const found = res.success ? (res.data ?? []) : [];
      setResults(found.filter((u) => u.user_id !== currentUser?.id));
      setSearching(false);
    });

    return () => {
      isMounted = false;
    };
  }, [debounced, currentUser?.id]);

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
    <LSChatSidebar
      activeChatId={activeChatId}
      onNewMessage={() => {
        setNewChatModalOpen(true);
        setDrawerOpened(false);
      }}
      onNavigate={() => setDrawerOpened(false)}
    />
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
            w={300}
            miw={300}
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
        onClose={closeNewMessage}
        title={
          <Title order={4} c="var(--ls-text-strong)">
            New Message
          </Title>
        }
        centered
      >
        <Stack gap="md">
          <TextInput
            placeholder="Search for a person by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            radius="xl"
            size="md"
            data-autofocus
            styles={{ input: { borderColor: "var(--ls-border)" } }}
          />

          {searching && (
            <Center>
              <Loader size="sm" />
            </Center>
          )}

          {results.length > 0 && (
            <Stack gap={0}>
              {results.map((person) => (
                <NavLink
                  key={person.user_id}
                  label={
                    <Text fw={600} c="var(--ls-text-strong)">
                      {person.first_name} {person.last_name}
                    </Text>
                  }
                  description={person.occupation ?? undefined}
                  leftSection={
                    <Avatar radius="xl" size="md" src={person.avatar_url} />
                  }
                  disabled={directChatMutation.isPending}
                  onClick={() => handleStartDirectChat(person.user_id)}
                  style={{ borderRadius: 8 }}
                />
              ))}
            </Stack>
          )}

          {query.trim() && !searching && results.length === 0 && (
            <Text size="sm" c="dimmed" ta="center">
              No users found
            </Text>
          )}

          {!query.trim() && (
            <Text size="sm" c="dimmed" ta="center">
              Pick someone to open a direct message with them. Group chats are
              created automatically with each group.
            </Text>
          )}
        </Stack>
      </Modal>
    </>
  );
}
