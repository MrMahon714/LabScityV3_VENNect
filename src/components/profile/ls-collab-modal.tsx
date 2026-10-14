"use client";

import {
  Box,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";
import { useState } from "react";

export interface LSCollaborationIntentModalProps {
  opened: boolean;
  onClose: () => void;
}

export function LSCollaborationIntentModal({ opened, onClose }: LSCollaborationIntentModalProps) {
  const [value, setValue] = useState("");

  return (
    <Modal.Root opened={opened} onClose={onClose} centered size="lg">
      <Modal.Overlay />
      <Modal.Content>
        <Modal.Header>
          <Group align="flex-start" justify="space-between" w="100%">
            <Modal.Title>
              <Group>
                <Box bg="navy.3" bdrs="md" p="8">
                  <IconUsers />
                </Box>
                <Stack gap="0">
                  <Text fw="700">Seeking Collaborators</Text>
                  <Text fz="xs" c="dimmed">
                    Describe what you need in a collaborator
                  </Text>
                </Stack>
              </Group>
            </Modal.Title>
            <Modal.CloseButton />
          </Group>
        </Modal.Header>

        <Modal.Body>
          <Stack gap="lg">
            <Textarea
              label="What are you looking for?"
              placeholder="e.g. I am studying pollinator decline in Florida and looking for a statistician or data scientist with experience in ecological modeling..."
              minRows={4}
              autosize
              value={value}
              onChange={(e) => setValue(e.currentTarget.value)}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={onClose}>Cancel</Button>
              <Button onClick={onClose}>Save</Button>
            </Group>
          </Stack>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}