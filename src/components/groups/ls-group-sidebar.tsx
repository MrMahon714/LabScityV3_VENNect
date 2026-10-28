"use client";

import {
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Group,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconBell, IconCompass, IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { LSSpinner } from "@/components/ui/ls-spinner";
import type { GroupListItem } from "@/lib/types/groups";
import { groupsPath } from "@/lib/utils/groups-url";
import type { GroupActivity } from "./use-group-activity";

function formatMembers(count: number) {
  return `${count} member${count === 1 ? "" : "s"}`;
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

export interface LSGroupSidebarProps {
  groups: GroupListItem[];
  activeGroupId?: number;
  view: "mine" | "discover";
  activityByGroup: Map<number, GroupActivity>;
  onNewGroupClick: () => void;
  onNavigate?: () => void;
  isLoading: boolean;
}

function NavItem({
  href,
  label,
  icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <UnstyledButton
      component={Link}
      href={href}
      onClick={() => onNavigate?.()}
      p="xs"
      style={{
        borderRadius: "var(--mantine-radius-md)",
        background: active ? "var(--ls-tint-bg)" : "transparent",
        border: active
          ? "1px solid var(--ls-tint-border)"
          : "1px solid transparent",
      }}
    >
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon
          size={36}
          radius="xl"
          variant={active ? "filled" : "light"}
          color="navy"
        >
          {icon}
        </ThemeIcon>
        <Text fw={600} c="var(--ls-text-strong)">
          {label}
        </Text>
      </Group>
    </UnstyledButton>
  );
}

/**
 * Sidebar listing the user's groups with NavLinks. Includes a "New" button
 * that triggers the create-group modal via the parent.
 */
export function LSGroupSidebar({
  groups,
  activeGroupId,
  view,
  activityByGroup,
  onNewGroupClick,
  onNavigate,
  isLoading,
}: LSGroupSidebarProps) {
  return (
    <Stack gap="md" p="md">
      <Title order={3} c="var(--ls-text-strong)">
        Groups
      </Title>

      <Stack gap={4}>
        <NavItem
          href={groupsPath({ tab: "mine" })}
          label="New activity"
          icon={<IconBell size={20} />}
          active={view === "mine" && !activeGroupId}
          onNavigate={onNavigate}
        />
        <NavItem
          href={groupsPath({ tab: "discover" })}
          label="Discover"
          icon={<IconCompass size={20} />}
          active={view === "discover"}
          onNavigate={onNavigate}
        />
      </Stack>

      <Button
        fullWidth
        leftSection={<IconPlus size={16} />}
        onClick={onNewGroupClick}
      >
        Create new group
      </Button>

      <Divider color="var(--ls-border)" />

      <Text fw={700} size="sm" c="var(--ls-text-strong)">
        Groups you've joined
      </Text>

      <ScrollArea.Autosize mah="calc(100vh - 60px - 330px)" type="auto">
        <Stack gap={2}>
          {isLoading ? (
            <Center h={100}>
              <LSSpinner />
            </Center>
          ) : groups.length === 0 ? (
            <Text size="sm" c="var(--ls-text-muted)">
              You haven't joined any groups yet.
            </Text>
          ) : (
            groups.map((group) => {
              const active = view === "mine" && group.group_id === activeGroupId;
              return (
                <UnstyledButton
                  key={group.group_id}
                  component={Link}
                  href={groupsPath({ tab: "mine", groupId: group.group_id })}
                  onClick={() => onNavigate?.()}
                  p="xs"
                  style={{
                    borderRadius: "var(--mantine-radius-md)",
                    background: active ? "var(--ls-tint-bg)" : "transparent",
                    border: active
                      ? "1px solid var(--ls-tint-border)"
                      : "1px solid transparent",
                  }}
                >
                  <Group gap="sm" wrap="nowrap">
                    <Avatar
                      size={40}
                      radius="md"
                      color="blue"
                      bg={group.avatar_url ? undefined : "var(--ls-brand)"}
                      src={group.avatar_url ?? undefined}
                    >
                      {initials(group.name)}
                    </Avatar>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={600} size="sm" c="var(--ls-text-strong)" truncate>
                        {group.name}
                      </Text>
                      <Text size="xs" c="var(--ls-text-muted)">
                        {formatMembers(group.memberCount)}
                      </Text>
                    </Box>
                    {(activityByGroup.get(group.group_id)?.total ?? 0) > 0 &&
                    !active ? (
                      <Badge size="sm" variant="filled">
                        {activityByGroup.get(group.group_id)?.total}
                      </Badge>
                    ) : null}
                  </Group>
                </UnstyledButton>
              );
            })
          )}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}
