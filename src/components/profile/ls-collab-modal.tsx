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
import { useEffect, useState } from "react";
import { MAX_COLLABORATION_INTENT } from "@/lib/constants/profile";
import { useUpdateCollaborationIntent, useUserProfile } from "./use-profile";

export interface LSCollaborationIntentModalProps {
  opened: boolean;
  onClose: () => void;
  userId: string;
}

export function LSCollaborationIntentModal({
  opened,
  onClose,
  userId,
}: LSCollaborationIntentModalProps) {
  const { data: profile } = useUserProfile(userId);
  const [value, setValue] = useState("");
  const updateIntent = useUpdateCollaborationIntent(userId, onClose);

  useEffect(() => {
    if (opened) setValue(profile?.seeking_description ?? "");
  }, [opened, profile]);

  return (
    <Modal.Root opened={opened} onClose={onClose} centered size="lg">
      <Modal.Overlay />
      <Modal.Content>
        <Modal.Header>
          <Group align="flex-start" justify="space-between" w="100%">
            <Modal.Title>
              <Group>
                <Box
                  bg="var(--ls-icon-badge-bg)"
                  c="var(--ls-icon-badge-color)"
                  bdrs="md"
                  p="8"
                >
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
              maxLength={MAX_COLLABORATION_INTENT}
              description={`${value.length} / ${MAX_COLLABORATION_INTENT}`}
              inputWrapperOrder={["label", "input", "description", "error"]}
              value={value}
              onChange={(e) => setValue(e.currentTarget.value)}
            />
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={onClose}
                disabled={updateIntent.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => updateIntent.mutate(value)}
                loading={updateIntent.isPending}
              >
                Save
              </Button>
            </Group>
          </Stack>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
