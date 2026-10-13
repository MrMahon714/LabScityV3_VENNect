import { Box, Center, Group, Modal, ScrollArea, Stack, Text } from "@mantine/core";
import type { User } from "@/lib/types/feed";
import LSMiniProfile from "@/components/profile/ls-mini-profile";
import { IconUsers } from "@tabler/icons-react";

/**
 * Props for LSProfileListModal.
 *
 * @param title - Modal title (e.g. "Friends", "Following").
 * @param profiles - Full list of User objects to render as LSMiniProfile rows.
 * @param opened - Controlled open state.
 * @param onClose - Called when the modal is closed.
 */
export interface LSProfileListModalProps {
  title: string;
  profiles: User[];
  opened: boolean;
  onClose: () => void;
}

/**
 * Scrollable modal that displays a full list of user profiles (body capped at 60vh with overflow).
 * Shared by the Friends and Following widgets on the profile page when "Show all X" is clicked.
 */
export default function LSProfileListModal({
  title,
  profiles,
  opened,
  onClose,
}: LSProfileListModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="md"
      title={
        <Group gap="xs" align="baseline">
          <Text fw={700} c="var(--ls-text-strong)">{title}</Text>
          <Text c="dimmed" size="sm">{profiles.length}</Text>
        </Group>
      }
    >
      {profiles.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap={6}>
            <IconUsers size={32} stroke={1.5} color="var(--mantine-color-navy-2)" />
            <Text c="dimmed" size="sm">
              No {title.toLowerCase()} yet
            </Text>
          </Stack>
        </Center>
      ) : (
        <ScrollArea.Autosize mah="60vh" type="auto" offsetScrollbars>
          <Stack gap={8}>
            {profiles.map((profile) => (
              <Box
                key={profile.user_id}
                p="sm"
                style={{
                  borderRadius: "var(--mantine-radius-md)",
                  border: "1px solid var(--ls-navy-tint)",
                }}
              >
                <LSMiniProfile
                  userId={profile.user_id}
                  posterEmail={profile.email}
                  posterName={`${profile.first_name} ${profile.last_name}`}
                  posterProfilePicURL={profile.avatar_url ?? undefined}
                />
              </Box>
            ))}
          </Stack>
        </ScrollArea.Autosize>
      )}
    </Modal>
  );
}
