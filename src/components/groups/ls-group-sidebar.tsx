"use client";

import {
  Avatar,
  Box,
  Button,
  Card,
  Center,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { LSSpinner } from "@/components/ui/ls-spinner";
import type { GroupListItem } from "@/lib/types/groups";
import { groupsPath } from "@/lib/utils/groups-url";

function formatMembers(count: number) {
  return `${count} member${count === 1 ? "" : "s"}`;
}

export interface LSGroupSidebarProps {
  groups: GroupListItem[];
  activeGroupId?: number;
  onNewGroupClick: () => void;
  isLoading: boolean;
}

/**
 * Sidebar listing the user's groups with NavLinks. Includes a "New" button
 * that triggers the create-group modal via the parent.
 */
export function LSGroupSidebar({
  groups,
  activeGroupId,
  onNewGroupClick,
  isLoading,
}: LSGroupSidebarProps) {
  return (
    <Stack gap="md" h="100%" p="md">
      <Card
        p="lg"
        withBorder
      >
        <Stack gap="md">
          <Box>
            <Title order={3} c="var(--ls-text-strong)">
              Groups
            </Title>
            <Text size="sm" c="var(--ls-text-muted)">
              Switch between your active research spaces and open a new one when
              you need it.
            </Text>
          </Box>
          <Button
            leftSection={<IconPlus size={14} />}
            onClick={onNewGroupClick}
          >
            New Group
          </Button>
        </Stack>
      </Card>

      <ScrollArea h={{ base: 240, md: "calc(100vh - 60px - 204px)" }}>
        <Stack gap="sm">
          {isLoading ? (
            <Center h={100}>
              <LSSpinner />
            </Center>
          ) : groups.length === 0 ? (
            <Card
              radius="xl"
              p="lg"
              withBorder
              bg="var(--ls-surface)"
              style={{ borderColor: "var(--ls-border)" }}
            >
              <Text size="sm" c="var(--ls-text-muted)">
                You haven't joined any groups yet.
              </Text>
            </Card>
          ) : (
            groups.map((group) => {
              const href = groupsPath({
                tab: "mine",
                groupId: group.group_id,
              });
              const active = group.group_id === activeGroupId;

              return (
                <NavLink
                  key={group.group_id}
                  href={href}
                  active={active}
                  p="md"
                  bdrs='md'
                  style={{
                    border: active
                      ? "1px solid var(--ls-tint-border)"
                      : "1px solid var(--ls-border)",
                    background: active ? "var(--ls-tint-bg)" : "var(--ls-surface)",
                    boxShadow: active
                      ? "3px 3px 10px rgba(37,99,235,0.12)"
                      : "0 1px 4px rgba(0,0,0,0.04)",
                  }}
                  styles={{
                    root: {
                      transition:
                        "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                    },
                  }}
                  label={
                    <Text fw={700} c="var(--ls-text-strong)" truncate>
                      {group.name}
                    </Text>
                  }
                  description={
                    <Text size="xs" c="var(--ls-text-muted)">
                      {formatMembers(group.memberCount)}
                    </Text>
                  }
                  leftSection={
                    <Avatar
                      radius="xl"
                      src={group.avatar_url ?? undefined}
                    >
                      {(group.name || "?")
                        .split(" ")
                        .filter(Boolean)
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </Avatar>
                  }
                />
              );
            })
          )}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
