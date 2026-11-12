"use client";

import {
  Avatar,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import type { UseMutationResult } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/use-auth";
import { searchForUsers } from "@/lib/actions/data";
import type { DataResponse } from "@/lib/types/data";
import type { User } from "@/lib/types/feed";
import type { GroupMember } from "@/lib/types/groups";
import type { InviteMembersValues } from "@/lib/validations/groups";

export interface LSInviteUserModalProps {
  opened: boolean;
  onClose: () => void;
  groupId: number;
  groupName: string;
  members: GroupMember[];
  inviteUsersMutation: UseMutationResult<
    DataResponse<{ invitedCount: number }>,
    Error,
    InviteMembersValues
  >;
}

/*lets any group member search for a person and send them a group invite
public groups will let any member invite somebody
private groups will only let admin/creator invite people*/
export function LSInviteUserModal({
  opened,
  onClose,
  groupId,
  groupName,
  members,
  inviteUsersMutation,
}: LSInviteUserModalProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [debounced] = useDebouncedValue(query, 300);
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);

  const memberIds = useMemo(
    () => new Set(members.map((m) => m.user_id)),
    [members],
  );

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

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setInvitedIds(new Set());
    onClose();
  };

  const handleInvite = (userId: string) => {
    setPendingId(userId);
    inviteUsersMutation.mutate(
      { groupId, userIds: [userId] },
      {
        onSuccess: () => setInvitedIds((current) => new Set(current).add(userId)),
        onSettled: () => setPendingId(null),
      },
    );
  };

  const visible = results.filter((r) => r.user_id !== user?.id);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={`Invite people to ${groupName}`}
      centered
    >
      <Stack gap="md">
        <TextInput
          placeholder="Search for a person by name"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          radius="xl"
          data-autofocus
        />

        {searching && (
          <Center>
            <Loader size="sm" />
          </Center>
        )}

        <Stack gap="xs">
          {visible.map((person) => {
            const name =
              `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() ||
              "Researcher";
            const isMember = memberIds.has(person.user_id);
            const invited = invitedIds.has(person.user_id);
            return (
              <Group key={person.user_id} justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <Avatar radius="xl" src={person.avatar_url} />
                  <Box style={{ minWidth: 0 }}>
                    <Text fw={600} size="sm" c="var(--ls-text-strong)" truncate>
                      {name}
                    </Text>
                    {person.occupation ? (
                      <Text size="xs" c="var(--ls-text-muted)" truncate>
                        {person.occupation}
                      </Text>
                    ) : null}
                  </Box>
                </Group>
                <Button
                  size="compact-sm"
                  variant={isMember || invited ? "default" : "filled"}
                  disabled={isMember || invited}
                  loading={pendingId === person.user_id}
                  onClick={() => handleInvite(person.user_id)}
                >
                  {isMember ? "Member" : invited ? "Invited" : "Invite"}
                </Button>
              </Group>
            );
          })}
        </Stack>

        {query.trim() && !searching && visible.length === 0 && (
          <Text size="sm" c="dimmed" ta="center">
            No users found
          </Text>
        )}

        {!query.trim() && (
          <Text size="sm" c="dimmed" ta="center">
            They'll get a notification they can accept or decline.
          </Text>
        )}
      </Stack>
    </Modal>
  );
}
