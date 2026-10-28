"use client";

import { useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import Link from "next/link";
import { useAuth } from "@/components/auth/use-auth";
import { useProfileGroups } from "@/components/profile/use-profile";
import { LSSpinner } from "@/components/ui/ls-spinner";
import { groupsPath } from "@/lib/utils/groups-url";
import { IconUsersGroup } from "@tabler/icons-react";
import classes from './ls-profile-groups-widget.module.css'

function groupInitials(name: string) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const COLLAPSED_COUNT = 3;

export function LSProfileGroupsWidget({
  userId,
  isOwnProfile,
}: {
  userId: string;
  isOwnProfile: boolean;
}) {
  const { user } = useAuth();
  const { data, isPending, isError, error, isFetching } = useProfileGroups(userId);
  const [expanded, setExpanded] = useState(false);

  if (!user?.id) return null;

  if (isPending && isFetching) {
    return (
      <Card shadow="sm" padding="md" radius="md" bd="1px solid gray.3">
        <Center py="sm">
          <LSSpinner />
        </Center>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card shadow="sm" padding="md" radius="md" bd="1px solid gray.3">
        <Text size="sm" c="red">
          {error instanceof Error ? error.message : "Could not load groups"}
        </Text>
      </Card>
    );
  }

  const groups = data ?? [];
  const hasOverflow = groups.length > COLLAPSED_COUNT;
  const visibleGroups = expanded ? groups : groups.slice(0, COLLAPSED_COUNT);

  return (
    <Card shadow="xs" padding="md" radius="md" bd="1px solid gray.3">
      <Group justify="space-between" align="center" mb={8}>
        <Group>
          <Box
            w={22}
            h={22}
            bg="var(--ls-icon-badge-bg)"
            style={{
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconUsersGroup size="1rem" color="var(--ls-icon-badge-color)" />
          </Box>
          <Text c="var(--ls-text-strong)" fw={900} size="sm">
            Groups
          </Text>
        </Group>        
        {groups.length > 0 && (
          <Text c="dimmed" size="xs">
            {groups.length}
          </Text>
        )}
      </Group>

      {groups.length > 0 ? (
        <Stack gap={6}>
          {visibleGroups.map((g) => (
            <UnstyledButton
              key={g.group_id}
              component={Link}
              href={groupsPath({ tab: "mine", groupId: g.group_id })}
              w="100%"
              className={classes.groupRow}
            >
              <Group wrap="nowrap" gap="xs" align="center">
                <Avatar
                  size={28}
                  radius="md"
                  color="navy.7"
                  bg={g.avatar_url ? undefined : "navy.7"}
                  src={g.avatar_url ?? undefined}
                >
                  {groupInitials(g.name)}
                </Avatar>
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Group wrap="nowrap" gap={6} align="center">
                    <Text fw={600} c="var(--ls-text-strong)" size="sm" lineClamp={1}>
                      {g.name}
                    </Text>
                    {isOwnProfile && g.privacy === "private" && (
                      <Badge size="xs" variant="light" color="gray">
                        Private
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">
                    {g.memberCount} member{g.memberCount === 1 ? "" : "s"}
                  </Text>
                </Box>
              </Group>
            </UnstyledButton>
          ))}

          {hasOverflow && (
            <UnstyledButton onClick={() => setExpanded((v) => !v)}>
              <Text c="navy.6" size="xs" fw={600} ta="center">
                {expanded ? "Show less" : `+${groups.length - COLLAPSED_COUNT} more`}
              </Text>
            </UnstyledButton>
          )}

          <Button
            component={Link}
            href={groupsPath({ tab: isOwnProfile ? "mine" : "discover" })}
            variant="subtle"
            color="navy"
            size="xs"
            mt={2}
          >
            {isOwnProfile ? "See all in Groups" : "Browse groups"}
          </Button>
        </Stack>
      ) : (
        <Center py="xs">
          <Text size="sm" c="navy.6">
            Nothing to see here!
          </Text>
        </Center>
      )}
    </Card>
  );
}