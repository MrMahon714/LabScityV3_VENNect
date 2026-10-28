"use client";

import {
  ActionIcon,
  Avatar,
  Box,
  Button,
  Center,
  Flex,
  Group,
  Indicator,
  Menu,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconDots,
  IconInfoCircle,
  IconPencil,
  IconSend,
  IconTrash,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { memo, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/app/use-is-mobile";
import {
  LSChatDetailsPanel,
  participantName,
} from "@/components/chat/ls-chat-details-panel";
import {
  useGetConversationParticipants,
  useGetOldMessages,
  useLeaveConversation,
  useMyGroupsList,
} from "@/components/chat/use-chat";
import {
  deleteMessage,
  editMessage,
  getChatsWithPreview,
  getOldMessages,
  markConversationAsRead,
} from "@/lib/actions/chat";
import { chatKeys } from "@/lib/query-keys";
import { groupsPath } from "@/lib/utils/groups-url";
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
  isGroupChat,
  isFirstOfRun,
  senderName,
  senderAvatar,
  canManage,
  onEdit,
  onRequestDelete,
}: {
  msg: Message;
  isMe: boolean;
  isSending?: boolean;
  showTimestamp: boolean;
  isGroupChat: boolean;
  isFirstOfRun: boolean;
  senderName: string;
  senderAvatar: string | null;
  canManage: boolean;
  onEdit: (id: number, content: string) => Promise<boolean>;
  onRequestDelete: (id: number) => void;
}) {
  const showSender = isGroupChat && !isMe;
  const [hovered, setHovered] = useState(false);
  const [menuOpened, setMenuOpened] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.content);
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    setDraft(msg.content);
    setEditing(true);
  };

  const saveEdit = async () => {
    const next = draft.trim();
    if (!next || next === msg.content) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const ok = await onEdit(msg.id, next);
    setSaving(false);
    if (ok) setEditing(false);
  };

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
    <Box
      style={{ maxWidth: "72%" }}
      ml={isMe ? "auto" : 0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {showSender && isFirstOfRun && (
        <Text size="xs" fw={600} c="var(--ls-text-muted)" mb={2} ml={36}>
          {senderName}
        </Text>
      )}
      <Group
        justify={isMe ? "flex-end" : "flex-start"}
        align="flex-end"
        gap="xs"
        wrap="nowrap"
      >
        {showSender && (
          <Box w={28} miw={28}>
            {isFirstOfRun && (
              <Avatar size={28} radius="xl" src={senderAvatar ?? undefined}>
                {(senderName || "?").slice(0, 1).toUpperCase()}
              </Avatar>
            )}
          </Box>
        )}
        {isMe && canManage && !editing && (
          <Menu
            position="bottom-end"
            shadow="md"
            withinPortal
            opened={menuOpened}
            onChange={setMenuOpened}
          >
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                radius="xl"
                aria-label="Message options"
                style={{
                  opacity: hovered || menuOpened ? 1 : 0.35,
                  transition: "opacity 120ms ease",
                }}
              >
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconPencil size={14} />}
                onClick={startEditing}
              >
                Edit message
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={() => onRequestDelete(msg.id)}
              >
                Delete message
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
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
          {editing ? (
            <Stack gap={6} miw={220}>
              <Textarea
                autosize
                minRows={1}
                maxRows={6}
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    saveEdit();
                  }
                  if (e.key === "Escape") setEditing(false);
                }}
                styles={{
                  input: {
                    background: "var(--ls-surface)",
                    color: "var(--ls-text-strong)",
                  },
                }}
              />
              <Group gap={6} justify="flex-end">
                <Button
                  size="compact-xs"
                  variant="subtle"
                  color="gray"
                  c="#F8FAFC"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="compact-xs"
                  variant="white"
                  color="dark"
                  loading={saving}
                  disabled={!draft.trim()}
                  onClick={saveEdit}
                >
                  Save
                </Button>
              </Group>
            </Stack>
          ) : (
            <Text size="sm" lh={1.6} style={{ whiteSpace: "pre-wrap" }}>
              {msg.content}
            </Text>
          )}
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
          ml={isMe ? 0 : showSender ? 36 : "md"}
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
  const [chatIsGroup, setChatIsGroup] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const isWide = useMediaQuery("(min-width: 75em)");

  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  const leaveConversationMutation = useLeaveConversation();

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

  const { data: myGroups } = useMyGroupsList();
  const linkedGroup = myGroups?.find(
    (g) => chat_id && g.conversation_id === parseInt(chat_id),
  );

  const participants =
    participantsData?.success && participantsData.data
      ? participantsData.data
      : [];
  const participantById = new Map(participants.map((p) => [p.user_id, p]));
  const isGroupChat =
    chatIsGroup || participants.length > 2 || Boolean(linkedGroup);
  const otherParticipant = participants.find((p) => p.user_id !== userId);
  const showPanel = Boolean(isWide) && panelOpen;
  const displayTitle =
    linkedGroup?.name ??
    (!isGroupChat && otherParticipant
      ? participantName(otherParticipant)
      : chatTitle);
  const participantsLoading = participantsData === undefined;
  const participantsFailed =
    participantsData !== undefined && !participantsData.success;
  const groupHref = linkedGroup
    ? groupsPath({ tab: "mine", groupId: linkedGroup.group_id })
    : null;

  const handleLeave = () => {
    leaveConversationMutation.mutate(parseInt(chat_id), {
      onSuccess: (result) => {
        if (result.success) {
          setInfoModalOpen(false);
          router.push("/chat");
        } else {
          notifications.show({
            title: "Could not leave chat",
            message: result.error ?? "Please try again",
            color: "red",
          });
        }
      },
    });
  };

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
        setChatTitle(activeChat?.name || "");
        setChatIsGroup(Boolean(activeChat?.is_group));
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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${chat_id}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((current) =>
            current.map((m) =>
              m.id === updated.id ? { ...m, content: updated.content } : m,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          const removedId = (payload.old as { id?: number }).id;
          if (removedId === undefined) return;
          setMessages((current) => current.filter((m) => m.id !== removedId));
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

  /*IMPORTANT: EDITING/DELETION LOGIC*/
  const handleEditMessage = async (id: number, content: string) => {
    const previous = messages.find((m) => m.id === id);
    if (!previous) return false;

    setMessages((current) =>
      current.map((m) => (m.id === id ? { ...m, content } : m)),
    );

    const result = await editMessage(id, content);
    if (!result.success) {
      setMessages((current) =>
        current.map((m) =>
          m.id === id ? { ...m, content: previous.content } : m,
        ),
      );
      notifications.show({
        title: "Could not edit message",
        message: "Please try again",
        color: "red",
      });
      return false;
    }

    queryClient.invalidateQueries({ queryKey: chatKeys.chatsWithPreview() });
    return true;
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId === null) return;
    const target = messages.find((m) => m.id === deleteTargetId);
    if (!target) {
      setDeleteTargetId(null);
      return;
    }

    setIsDeleting(true);
    setMessages((current) => current.filter((m) => m.id !== target.id));

    const result = await deleteMessage(target.id);
    setIsDeleting(false);
    setDeleteTargetId(null);

    if (!result.success) {
      setMessages((current) =>
        [...current, target].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
      );
      notifications.show({
        title: "Could not delete message",
        message: result.error ?? "Please try again",
        color: "red",
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: chatKeys.chatsWithPreview() });
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
    <Flex
      h="100%"
      style={{
        overflow: "hidden",
        background: "var(--ls-chat-bg)",
      }}
    >
    <Stack flex={1} miw={0} h="100%" gap={0} style={{ overflow: "hidden" }}>
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
              {!isGroupChat && otherParticipant && (
                <Avatar
                  size={32}
                  radius="xl"
                  src={otherParticipant.avatar_url ?? undefined}
                >
                  {participantName(otherParticipant).slice(0, 1).toUpperCase()}
                </Avatar>
              )}
              <Title order={3} c="var(--ls-text-strong)" style={{ margin: 0 }}>
                {displayTitle || "Chat"}
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
            onClick={() =>
              isWide ? setPanelOpen((open) => !open) : setInfoModalOpen(true)
            }
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
            {displayTitle || "Chat"}
          </Title>
        }
        centered
      >
        <Box mx="-md" mb="-md" style={{ maxHeight: "70vh" }}>
          <LSChatDetailsPanel
            isGroupChat={isGroupChat}
            title={displayTitle || "Chat"}
            participants={participants}
            currentUserId={userId}
            groupHref={groupHref}
            isLoading={participantsLoading}
            loadFailed={participantsFailed}
            onLeave={handleLeave}
            isLeaving={leaveConversationMutation.isPending}
          />
        </Box>
      </Modal>

      <Modal
        opened={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title="Delete message?"
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm" c="var(--ls-text-muted)">
            This removes the message for everyone in the chat. This can't be
            undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTargetId(null)}>
              Cancel
            </Button>
            <Button color="red" loading={isDeleting} onClick={handleConfirmDelete}>
              Delete
            </Button>
          </Group>
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
            const isFirstOfRun =
              !prevMsg || prevMsg.sender_id !== msg.sender_id || timeDiff >= 2;
            const sender = participantById.get(msg.sender_id);
            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isMe={isMe}
                isSending={isSending}
                showTimestamp={showTimestamp}
                isGroupChat={isGroupChat}
                isFirstOfRun={isFirstOfRun}
                senderName={sender ? participantName(sender) : "Unknown"}
                senderAvatar={sender?.avatar_url ?? null}
                canManage={isMe && !isSending}
                onEdit={handleEditMessage}
                onRequestDelete={setDeleteTargetId}
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
            placeholder={`Message ${displayTitle || "..."}`}
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

    {showPanel && (
      <Paper
        w={320}
        miw={320}
        h="100%"
        radius={0}
        bg="var(--ls-chat-rail-bg)"
        style={{
          flexShrink: 0,
          borderLeft: "1px solid var(--mantine-color-gray-3)",
        }}
      >
        <LSChatDetailsPanel
          isGroupChat={isGroupChat}
          title={displayTitle || "Chat"}
          participants={participants}
          currentUserId={userId}
          groupHref={groupHref}
          isLoading={participantsLoading}
          loadFailed={participantsFailed}
          onLeave={handleLeave}
          isLeaving={leaveConversationMutation.isPending}
        />
      </Paper>
    )}
    </Flex>
  );
}
