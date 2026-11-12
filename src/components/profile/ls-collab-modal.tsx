"use client";

import {
  Box,
  Button,
  Group,
  Modal,
  Stack,
  Switch,
  Text,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconUsers } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { updateCollaborationIntentAction } from "@/lib/actions/profile";
import {
  MAX_COLLAB_INTENT_LENGTH,
  type UpdateCollaborationIntentValues,
} from "@/lib/validations/profile";

export interface LSCollaborationIntentModalProps {
  opened: boolean;
  onClose: () => void;
  userId: string;
  initialDescription: string;
  initialVisible: boolean;
}

export function LSCollaborationIntentModal({
  opened,
  onClose,
  userId,
  initialDescription,
  initialVisible,
}: LSCollaborationIntentModalProps) {
  const [value, setValue] = useState(initialDescription);
  const [visible, setVisible] = useState(initialVisible);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (opened) {
      setValue(initialDescription);
      setVisible(initialVisible);
    }
  }, [opened, initialDescription, initialVisible]);

  const saveMutation = useMutation({
    mutationFn: async (input: UpdateCollaborationIntentValues) => {
      const result = await updateCollaborationIntentAction(input);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to save collaboration intent");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (query) => JSON.stringify(query.queryKey).includes(userId),
      });
      notifications.show({
        title: "Collaboration intent saved",
        message: visible
          ? "Other users can see it on your profile."
          : "It's hidden from other users.",
        color: "green",
      });
      onClose();
    },
    onError: (err) =>
      notifications.show({
        title: "Could not save collaboration intent",
        message: err instanceof Error ? err.message : "Something went wrong",
        color: "red",
      }),
  });

  return (
    <Modal.Root opened={opened} onClose={onClose} centered size="lg">
      <Modal.Overlay />
      <Modal.Content>
        <Modal.Header>
          <Group align="flex-start" justify="space-between" w="100%">
            <Modal.Title>
              <Group>
                <Box bg="var(--ls-icon-badge-bg)" c="var(--ls-icon-badge-color)" bdrs="md" p="8">
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
              maxLength={MAX_COLLAB_INTENT_LENGTH}
              value={value}
              onChange={(e) => setValue(e.currentTarget.value)}
            />

            <Switch
              color="navy"
              label="Show on my profile"
              description={
                visible
                  ? "Other users can see your collaboration intent."
                  : "Only you can see it. Turn on to make it visible to other users."
              }
              checked={visible}
              onChange={(e) => setVisible(e.currentTarget.checked)}
            />

            <Group justify="flex-end">
              <Button variant="default" onClick={onClose} disabled={saveMutation.isPending}>
                Cancel
              </Button>
              <Button
                loading={saveMutation.isPending}
                onClick={() =>
                  saveMutation.mutate({ seekingDescription: value, seekingVisible: visible })
                }
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