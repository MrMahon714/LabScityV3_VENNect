"use client";

import {
  ActionIcon,
  Box,
  Button,
  Center,
  Group,
  Indicator,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle, IconSend } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { memo, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/app/use-is-mobile";
import {
  useGetConversationParticipants,
  useGetOldMessages,
  useLeaveConversation,
  useUpdateConversationName,
} from "@/components/chat/use-chat";
import {
  getChatsWithPreview,
  getOldMessages,
  markConversationAsRead,
} from "@/lib/actions/chat";
import { chatKeys } from "@/lib/query-keys";
import { createClient } from "@/supabase/client";

interface Message {
  id: number;
  conversation_id: number;
  sender_id: string;
  content: string;
  created_at: string;
}

const MessageBubble = memo(function MessageBubble({
  msg,
  isMe,
  isSending,
  showTimestamp,
}: {
  msg: Message;
  isMe: boolean;
  isSending?: boolean;
  showTimestamp: boolean;
}) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <Box style={{ maxWidth: "72%" }} ml={isMe ? "auto" : 0}>
      <Group
        justify={isMe ? "flex-end" : "flex-start"}
        align="flex-end"
        gap="xs"
      >
        <Paper
          p="sm"
          px="md"
          radius="xl"
          bg={isMe ? "var(--ls-brand)" : "var(--ls-surface)"}
          c={isMe ? "#F8FAFC" : "var(--ls-text-strong)"}
          withBorder={!isMe}
          shadow="xs"
          style={{ opacity: isSending ? 0.7 : 1 }}
        >
          <Text size="sm" lh={1.6} style={{ whiteSpace: "pre-wrap" }}>
            {msg.content}
          </Text>
          {isSending && (
            <Text fz="10px" c={isMe ? "#CBD5E1" : "dimmed"} mt={4}>
              Sending...
            </Text>
          )}
        </Paper>
      </Group>
      {showTimestamp && !isSending && (
        <Text
          fz="10px"
          c="dimmed"
          ta={isMe ? "right" : "left"}
          mt={4}
          ml={isMe ? 0 : "md"}
          mr={isMe ? "md" : 0}
        >
          {formatTime(msg.created_at)}
        </Text>
      )}
    </Box>
  );
});

export default function ChatPage() {
  const supabase = useState(() => createClient())[0];
  const { chat_id } = useParams<{ chat_id: string }>();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [inputText, setInputText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [optimisticIds, setOptimisticIds] = useState<Set<number>>(new Set());
  const [chatTitle, setChatTitle] = useState<string>("");

  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [membersExpanded, setMembersExpanded] = useState(false);

  const [chatName, setChatName] = useState("");

  const leaveConversationMutation = useLeaveConversation();
  const updateConversationNameMutation = useUpdateConversationName();

  const queryClient = useQueryClient();

  const viewport = useRef<HTMLDivElement>(null);
  const scrollReason = useRef<"init" | "new_message" | "pagination">("init");
  const optimisticIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    setMessages([]);
    setHasMore(true);
  }, [chat_id]);

  useEffect(() => {
    if (!chat_id) return;

    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };

    fetchUser();
  }, [chat_id, supabase]);

  const { data: messagesResult } = useGetOldMessages(
    chat_id ? parseInt(chat_id) : 0,
  );

  const { data: participantsData } = useGetConversationParticipants(
    chat_id ? parseInt(chat_id) : 0,
  );

  useEffect(() => {
    if (messagesResult?.success && messagesResult.data) {
      scrollReason.current = "init";
      setMessages(messagesResult.data);
      setHasMore(messagesResult.data.length >= 50);
      if (chat_id) {
        markConversationAsRead(parseInt(chat_id));
        queryClient.invalidateQueries({
          queryKey: chatKeys.chatsWithPreview(),
        });
      }
    }
  }, [messagesResult, chat_id, queryClient]);

  useEffect(() => {
    if (!chat_id) return;

    const fetchChatTitle = async () => {
      try {
        const { data: chatsData } = await getChatsWithPreview();
        if (!chatsData) return;
        const activeChat = chatsData.find(
          (c) => c.conversation_id.toString() === chat_id,
        );
        setChatTitle(activeChat?.name || `Chat #${chat_id}`);
      } catch (error) {
        console.error("Error fetching chat title:", error);
      }
    };

    fetchChatTitle();
  }, [chat_id]);

  useEffect(() => {
    if (!chat_id || !supabase) return;

    const uniqueChannelName = `room:${chat_id}-${Date.now()}`;

    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${chat_id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;

          setMessages((current) => {
            const optimisticIdToRemove = Array.from(
              optimisticIdsRef.current,
            ).find((id) => {
              const optimisticMsg = current.find((m) => m.id === id);
              return (
                optimisticMsg &&
                optimisticMsg.content === newMessage.content &&
                optimisticMsg.sender_id === newMessage.sender_id
              );
            });

            if (optimisticIdToRemove) {
              optimisticIdsRef.current.delete(optimisticIdToRemove);
              setOptimisticIds((current) => {
                const next = new Set(current);
                next.delete(optimisticIdToRemove);
                return next;
              });
              return current
                .filter((m) => m.id !== optimisticIdToRemove)
                .concat(newMessage);
            }

            return [...current, newMessage];
          });

          scrollReason.current = "new_message";
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setIsConnected(true);
        if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [chat_id, supabase]);

  useEffect(() => {
    if (!viewport.current) return;

    if (scrollReason.current === "init") {
      viewport.current.scrollTo({
        top: viewport.current.scrollHeight,
        behavior: "instant",
      });
    } else if (scrollReason.current === "new_message") {
      const { scrollTop, scrollHeight, clientHeight } = viewport.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      if (distanceFromBottom < 100) {
        viewport.current.scrollTo({
          top: scrollHeight,
          behavior: "instant",
        });
      }
    }
  }, [messages]);

  const loadMore = async () => {
    if (isLoadingMore || !hasMore || messages.length === 0 || !chat_id) return;

    setIsLoadingMore(true);
    scrollReason.current = "pagination";

    const oldestMessageTimestamp = messages[0].created_at;
    const oldScrollHeight = viewport.current?.scrollHeight || 0;

    const response = await getOldMessages(
      parseInt(chat_id),
      oldestMessageTimestamp,
    );

    if (response.success && response.data) {
      if (response.data.length < 50) setHasMore(false);

      setMessages((current) => [...response.data!, ...current]);

      setTimeout(() => {
        if (viewport.current) {
          const newScrollHeight = viewport.current.scrollHeight;
          viewport.current.scrollTop = newScrollHeight - oldScrollHeight;
        }
      }, 0);
    }

    setIsLoadingMore(false);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !userId || !chat_id) return;

    const textToSend = inputText;
    setInputText("");

    const optimisticMessage: Message = {
      id: Date.now(),
      conversation_id: parseInt(chat_id),
      sender_id: userId,
      content: textToSend,
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticMessage]);
    setOptimisticIds((current) => new Set(current).add(optimisticMessage.id));
    optimisticIdsRef.current.add(optimisticMessage.id);

    const { error } = await supabase.from("messages").insert({
      conversation_id: parseInt(chat_id),
      sender_id: userId,
      content: textToSend,
    });

    if (error) {
      console.error("Error sending:", error);
      setMessages((current) =>
        current.filter((m) => m.id !== optimisticMessage.id),
      );
      setOptimisticIds((current) => {
        const next = new Set(current);
        next.delete(optimisticMessage.id);
        return next;
      });
      optimisticIdsRef.current.delete(optimisticMessage.id);
      notifications.show({
        title: "Failed to send message",
        message: "Please try again",
        color: "red",
      });
      setInputText(textToSend);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!chat_id)
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );

  return (
    <Stack
      h="100%"
      gap={0}
      style={{
        overflow: "hidden",
        background: "var(--ls-chat-bg)",
      }}
    >
      {/* HEADER */}
      <Paper
        p={isMobile ? "sm" : "lg"}
        radius={0}
        withBorder
        bg="var(--ls-surface)"
        style={{
          zIndex: 10,
          flexShrink: 0,
          position: "relative",
          borderBottomColor: "var(--ls-border)",
        }}
      >
        <Group justify="space-between" align="center" gap="md">
          <Box>
            <Group gap="xs" align="center">
              <Title order={3} c="var(--ls-text-strong)" style={{ margin: 0 }}>
                {chatTitle || `Chat #${chat_id}`}
              </Title>
              <Indicator
                color={isConnected ? "green" : "yellow"}
                size={8}
                processing
              />
            </Group>
            <Text size="sm" c="var(--ls-text-muted)">
              {isConnected ? "Live conversation" : "Reconnecting..."}
            </Text>
          </Box>
          <ActionIcon
            variant="light"
            color="blue"
            radius="xl"
            size="lg"
            onClick={() => setInfoModalOpen(true)}
            style={{ background: "var(--ls-tint-bg)", color: "var(--ls-tint-text)" }}
          >
            <IconInfoCircle size="1.2rem" />
          </ActionIcon>
        </Group>
      </Paper>

      {/* INFO MODAL */}
      <Modal
        opened={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        title={
          <Title order={4} c="var(--ls-text-strong)">
            {chatTitle || `Chat #${chat_id}`}
          </Title>
        }
        centered
      >
        <Stack gap="md">
          {messages.length > 0 && (
            <Text size="sm" c="var(--ls-text-strong)">
              <Text span fw={600}>
                Conversation started:{" "}
              </Text>
              {new Date(messages[0].created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          )}

          <Box>
            <Text size="sm" fw={600} c="var(--ls-text-strong)" mb={6}>
              Members
            </Text>
            {participantsData?.success && participantsData.data ? (
              <>
                <Stack gap={4}>
                  {participantsData.data
                    .slice(0, membersExpanded ? undefined : 3)
                    .map((participant) => (
                      <Text key={participant.user_id} size="sm" c="dimmed">
                        {participant.first_name} {participant.last_name} -{" "}
                        {participant.email}
                      </Text>
                    ))}
                </Stack>
                {participantsData.data.length > 3 && (
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={() => setMembersExpanded(!membersExpanded)}
                    mt={4}
                  >
                    {membersExpanded
                      ? "Show less"
                      : `Show ${participantsData.data.length - 3} more`}
                  </Button>
                )}
              </>
            ) : (
              <Text size="sm" c="dimmed">
                Unable to load members
              </Text>
            )}
          </Box>

          <Box>
            <Text size="sm" fw={600} c="var(--ls-text-strong)" mb={6}>
              Update Chat Name
            </Text>
            <Group gap="xs">
              <TextInput
                placeholder="Enter a new name..."
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
                radius="xl"
                size="sm"
                style={{ flex: 1 }}
              />
              <Button
                color="navy.7"
                variant="filled"
                radius="xl"
                size="sm"
                disabled={!chatName.trim()}
                loading={updateConversationNameMutation.isPending}
                onClick={() =>
                  updateConversationNameMutation.mutate(
                    { id: parseInt(chat_id), newName: chatName.trim() },
                    {
                      onSuccess: () => {
                        setChatTitle(chatName.trim());
                        setChatName("");
                      },
                    },
                  )
                }
              >
                Save
              </Button>
            </Group>
          </Box>

          <Button
            fullWidth
            color="red"
            variant="light"
            radius="xl"
            loading={leaveConversationMutation.isPending}
            onClick={() =>
              leaveConversationMutation.mutate(parseInt(chat_id), {
                onSuccess: () => {
                  setInfoModalOpen(false);
                  router.push("/chat");
                },
              })
            }
          >
            Leave Chat
          </Button>
        </Stack>
      </Modal>

      {/* MESSAGES */}
      <ScrollArea
        flex={1}
        viewportRef={viewport}
        style={{ overflowX: "hidden" }}
      >
        <Stack gap="md" p={isMobile ? "sm" : "md"}>
          {hasMore && messages.length > 0 && (
          <Center mb="sm">
            <Button
              variant="light"
              radius="xl"
              size="xs"
              loading={isLoadingMore}
              style={{ background: "var(--ls-tint-bg)", color: "var(--ls-tint-text)" }}
              onClick={loadMore}
            >
              Load older messages
            </Button>
          </Center>
          )}

          {messages.length === 0 && (
            <Center h={200}>
              <Text c="var(--ls-text-muted)" size="sm">
                No messages yet. Say hello!
              </Text>
            </Center>
          )}

          {messages.map((msg, index) => {
            const isMe = msg.sender_id === userId;
            const isSending = optimisticIds.has(msg.id);
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const timeDiff = prevMsg
              ? (new Date(msg.created_at).getTime() -
                  new Date(prevMsg.created_at).getTime()) /
                (1000 * 60)
              : Infinity;
            const showTimestamp = !prevMsg || timeDiff >= 2;
            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isMe={isMe}
                isSending={isSending}
                showTimestamp={showTimestamp}
              />
            );
          })}
        </Stack>
      </ScrollArea>

      {/* INPUT */}
      <Paper
        p={isMobile ? "sm" : "lg"}
        withBorder
        radius={0}
        bg="var(--ls-surface)"
        style={{ flexShrink: 0, borderTopColor: "var(--ls-border)" }}
      >
        <Group align="flex-end">
          <TextInput
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ flex: 1 }}
            radius="xl"
            size="md"
            disabled={!isConnected}
            styles={{ input: { borderColor: "var(--ls-border)", minHeight: 46 } }}
          />
          <ActionIcon
            size="xl"
            variant="filled"
            radius="xl"
            onClick={handleSend}
            disabled={!inputText.trim() || !isConnected}
          >
            <IconSend size="1.1rem" />
          </ActionIcon>
        </Group>
      </Paper>
    </Stack>
  );
}
