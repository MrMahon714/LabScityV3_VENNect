"use client";

import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  Group,
  Menu,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconEdit,
  IconLock,
  IconLogout,
  IconMessageCircle,
  IconSettings,
  IconTrash,
  IconUserPlus,
  IconUsers,
  IconWorld,
} from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import type { GroupMember, GroupWithMembers } from "@/lib/types/groups";
import { LSGroupFeed } from "./ls-group-feed";
import type { LSGroupFeedProps } from "./ls-group-layout.types";

function initials(name: string) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function memberName(m: GroupMember) {
  return `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "Researcher";
}

function formatCreated(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const cardStyle = {
  borderColor: "var(--ls-border)",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
};

function TopicBadges({ topics }: { topics: string[] }) {
  if (!topics?.length) return null;
  return (
    <Group gap={6} wrap="wrap">
      {topics.slice(0, 6).map((topic) => (
        <Badge
          key={topic}
          size="sm"
          variant="light"
          style={{
            background: "var(--ls-tint-bg-2)",
            color: "var(--ls-tint-text)",
            border: "1px solid var(--ls-tint-border)",
          }}
        >
          {topic}
        </Badge>
      ))}
    </Group>
  );
}

function AboutCard({
  group,
  onSeeMembers,
}: {
  group: GroupWithMembers;
  onSeeMembers?: () => void;
}) {
  const isPublic = group.privacy === "public";
  return (
    <Paper
      p="lg"
      radius="md"
      withBorder
      bg="var(--ls-surface)"
      style={cardStyle}
    >
      <Stack gap="sm">
        <Title order={5} c="var(--ls-text-strong)">
          About
        </Title>
        {group.description ? (
          <Text size="sm" c="var(--ls-text-body)" lh={1.6}>
            {group.description}
          </Text>
        ) : (
          <Text size="sm" c="var(--ls-text-muted)">
            This group doesn't have a description yet.
          </Text>
        )}
        <Group gap="xs" wrap="nowrap" align="flex-start">
          {isPublic ? (
            <IconWorld size={18} color="var(--ls-text-muted)" />
          ) : (
            <IconLock size={18} color="var(--ls-text-muted)" />
          )}
          <Box>
            <Text size="sm" fw={600} c="var(--ls-text-strong)">
              {isPublic ? "Public" : "Private"}
            </Text>
            <Text size="xs" c="var(--ls-text-muted)">
              {isPublic
                ? "Anyone can find this group and see its posts."
                : "Only members can see who's in the group and what they post."}
            </Text>
          </Box>
        </Group>
        <Text size="xs" c="var(--ls-text-muted)">
          {isPublic
            ? "Any member can invite people to this group."
            : "People can only join by invitation, and only admins can invite."}
        </Text>
        <Text size="xs" c="var(--ls-text-muted)">
          Created {formatCreated(group.created_at)}
        </Text>
        <TopicBadges topics={group.topics} />
        {onSeeMembers ? (
          <>
            <Group justify="space-between" mt="xs">
              <Text size="sm" fw={600} c="var(--ls-text-strong)">
                {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
              </Text>
              <Button variant="subtle" size="compact-sm" onClick={onSeeMembers}>
                See all
              </Button>
            </Group>
            <Avatar.Group>
              {group.members.slice(0, 8).map((m) => (
                <Tooltip key={m.user_id} label={memberName(m)} withArrow>
                  <Avatar size="md" radius="xl" src={m.avatar_url ?? undefined}>
                    {initials(memberName(m))}
                  </Avatar>
                </Tooltip>
              ))}
              {group.memberCount > 8 ? (
                <Avatar size="md" radius="xl">
                  +{group.memberCount - 8}
                </Avatar>
              ) : null}
            </Avatar.Group>
          </>
        ) : null}
      </Stack>
    </Paper>
  );
}

function MembersGrid({ members }: { members: GroupMember[] }) {
  return (
    <Paper
      p="lg"
      radius="md"
      withBorder
      bg="var(--ls-surface)"
      style={cardStyle}
    >
      <Stack gap="md">
        <Title order={5} c="var(--ls-text-strong)">
          Members · {members.length}
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {members.map((m) => (
            <UnstyledButton
              key={m.user_id}
              component={Link}
              href={`/profile/${m.user_id}`}
              p="sm"
              style={{
                border: "1px solid var(--ls-border)",
                borderRadius: "var(--mantine-radius-md)",
              }}
            >
              <Group gap="sm" wrap="nowrap">
                <Avatar size={48} radius="xl" src={m.avatar_url ?? undefined}>
                  {initials(memberName(m))}
                </Avatar>
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={600} c="var(--ls-text-strong)" truncate>
                    {memberName(m)}
                  </Text>
                  <Text size="xs" c="var(--ls-text-muted)">
                    {m.role}
                  </Text>
                </Box>
                {m.role !== "Member" ? (
                  <Badge size="sm" variant="light" color="navy">
                    {m.role}
                  </Badge>
                ) : null}
              </Group>
            </UnstyledButton>
          ))}
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}

export interface LSGroupPageProps {
  group: GroupWithMembers;
  isMember: boolean;
  isAdmin: boolean;
  onOpenChat: () => void;
  onInvite: () => void;
  onEdit: () => void;
  onManageMembers: () => void;
  onDelete: () => void;
  onLeave: () => void;
  isLeaving: boolean;
  isDeleting: boolean;
  feedProps: LSGroupFeedProps;
}

export function LSGroupPage({
  group,
  isMember,
  isAdmin,
  onOpenChat,
  onInvite,
  onEdit,
  onManageMembers,
  onDelete,
  onLeave,
  isLeaving,
  isDeleting,
  feedProps,
}: LSGroupPageProps) {
  const [tab, setTab] = useState<string | null>("discussion");
  const isPublic = group.privacy === "public";
  const canInvite = isMember && (isPublic || isAdmin);

  return (
    <Stack gap="md">
      <Paper
        radius="md"
        withBorder
        bg="var(--ls-surface)"
        style={{ ...cardStyle, overflow: "hidden" }}
      >
        <Box
          h={{ base: 120, sm: 190 }}
          style={{
            background:
              "linear-gradient(135deg, var(--ls-brand) 0%, var(--ls-accent) 100%)",
          }}
        />

        <Box px="lg" pb="md">
          <Flex
            align={{ base: "flex-start", sm: "flex-end" }}
            direction={{ base: "column", sm: "row" }}
            justify="space-between"
            gap="md"
            style={{ marginTop: -48 }}
          >
            <Group align="flex-end" gap="md" wrap="nowrap">
              <Avatar
                size={112}
                radius="md"
                color="blue"
                bg={group.avatar_url ? undefined : "var(--ls-brand)"}
                src={group.avatar_url ?? undefined}
                styles={{ root: { border: "4px solid var(--ls-surface)" } }}
              >
                {initials(group.name)}
              </Avatar>
              <Box pb={6} style={{ minWidth: 0 }}>
                <Title order={2} c="var(--ls-text-strong)" lh={1.2}>
                  {group.name}
                </Title>
                <Group gap={6} mt={4} wrap="nowrap">
                  {isPublic ? (
                    <IconWorld size={16} color="var(--ls-text-muted)" />
                  ) : (
                    <IconLock size={16} color="var(--ls-text-muted)" />
                  )}
                  <Text size="sm" c="var(--ls-text-muted)">
                    {isPublic ? "Public" : "Private"} group · {group.memberCount}{" "}
                    member{group.memberCount === 1 ? "" : "s"}
                  </Text>
                </Group>
              </Box>
            </Group>

            <Group gap="xs">
              {canInvite ? (
                <Button
                  leftSection={<IconUserPlus size={16} />}
                  onClick={onInvite}
                >
                  Invite
                </Button>
              ) : null}
              {group.conversation_id ? (
                <Button
                  variant="default"
                  leftSection={<IconMessageCircle size={16} />}
                  onClick={onOpenChat}
                >
                  Group chat
                </Button>
              ) : null}
              {isMember ? (
                isAdmin ? (
                  <Menu shadow="md" width={260} position="bottom-end">
                    <Menu.Target>
                      <Button
                        variant="default"
                        leftSection={<IconSettings size={16} />}
                        aria-label="Group settings"
                      >
                        Settings
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconEdit size={16} />}
                        onClick={onEdit}
                      >
                        Edit group
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconUsers size={16} />}
                        onClick={onManageMembers}
                      >
                        Manage members
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={16} />}
                        onClick={onDelete}
                        disabled={isDeleting}
                      >
                        Delete group
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                ) : (
                  <Button
                    variant="light"
                    color="red"
                    leftSection={<IconLogout size={16} />}
                    onClick={onLeave}
                    loading={isLeaving}
                  >
                    Leave
                  </Button>
                )
              ) : null}
            </Group>
          </Flex>

          <Avatar.Group mt="md">
            {group.members.slice(0, 7).map((m) => (
              <Tooltip key={m.user_id} label={memberName(m)} withArrow>
                <Avatar size="md" radius="xl" src={m.avatar_url ?? undefined}>
                  {initials(memberName(m))}
                </Avatar>
              </Tooltip>
            ))}
            {group.memberCount > 7 ? (
              <Avatar size="md" radius="xl">
                +{group.memberCount - 7}
              </Avatar>
            ) : null}
          </Avatar.Group>
        </Box>

        <Tabs value={tab} onChange={setTab} color="navy">
          <Tabs.List px="md">
            <Tabs.Tab value="discussion" py="md" px="lg" fw={600}>
              Discussion
            </Tabs.Tab>
            <Tabs.Tab value="members" py="md" px="lg" fw={600}>
              Members
            </Tabs.Tab>
            <Tabs.Tab value="about" py="md" px="lg" fw={600}>
              About
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </Paper>

      {tab === "discussion" && (
        <Flex gap="md" align="flex-start" direction={{ base: "column", lg: "row" }}>
          <Box flex={1} miw={0} w="100%">
            <LSGroupFeed {...feedProps} />
          </Box>
          <Box
            w={{ base: "100%", lg: 340 }}
            miw={{ lg: 340 }}
            visibleFrom="lg"
            style={{ position: "sticky", top: 16 }}
          >
            <AboutCard group={group} onSeeMembers={() => setTab("members")} />
          </Box>
        </Flex>
      )}

      {tab === "members" && <MembersGrid members={group.members} />}

      {tab === "about" && <AboutCard group={group} />}
    </Stack>
  );
}
