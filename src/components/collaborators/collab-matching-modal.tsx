'use client';

import { Group, Modal, Stack, Text } from "@mantine/core";

export default function CollabMatchingModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  return (
    <Modal.Root opened={opened} onClose={onClose} size="900px">
      <Modal.Overlay />
      <Modal.Content bdrs="lg">
        <Modal.Header p="0">
          <Group
            p="1rem 1.5rem"
            w="100%"
            wrap="nowrap"
            justify="space-between"
            style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}
            gap="0"
          >
            <Stack gap="2">
              <Text fw="600" fz="lg" lh="1.5rem">
                Recommended Collaborators
              </Text>
              <Text c="dimmed" fz="sm" lh="1rem">
                Matching Algorithm
              </Text>
            </Stack>
            {/* Mantine's own close button — reads onClose from Modal.Root context,
                so it needs no onClick and matches the Edit Profile modal exactly. */}
            <Modal.CloseButton />
          </Group>
        </Modal.Header>

        <Stack p="1.5rem">
          <Text c="dimmed" fz="sm">Filters go here.</Text>
        </Stack>
      </Modal.Content>
    </Modal.Root>
  );
}