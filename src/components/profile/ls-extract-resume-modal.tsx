'use client';

import {
  Box,
  Button,
  FileButton,
  Group,
  Loader,
  Modal,
  Stack,
  TagsInput,
  Text,
} from "@mantine/core";
import { IconFileText } from "@tabler/icons-react";
import { useState } from "react";
import { useExtractResume, useConfirmExtractedData } from "@/components/profile/use-profile";
import { useAuth } from "@/components/auth/use-auth";

type ExtractedData = {
  skills: string[];
  researchAreas: string[];
};

export default function LSExtractResumeModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);
  const [successMessage, setSuccessMessage] = useState(false);

  const extractMutation = useExtractResume();
  const confirmMutation = useConfirmExtractedData(user?.id ?? "");

  const handleClose = () => {
    setFile(null);
    setExtractedData(null);
    setEditedData(null);
    setSuccessMessage(false);
    onClose();
  };

  const handleUpload = (selected: File | null) => {
    setFile(selected);
  };

  const handleExtract = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await extractMutation.mutateAsync(formData);
      setExtractedData(result.extractedData);
      setEditedData(result.extractedData);
    } catch (error) {
      console.error("Extraction error:", error);
    }
  };

  const handleConfirm = async () => {
    if (!editedData) return;

    try {
      await confirmMutation.mutateAsync(editedData);
      setSuccessMessage(true);
    } catch (error) {
      console.error("Confirm error:", error);
    }
  };

  // Screen 1: Upload
  if (!extractedData) {
    return (
      <Modal.Root opened={opened && !successMessage} onClose={handleClose} size="440px" centered>
        <Modal.Overlay />
        <Modal.Content bdrs="lg">
          <Modal.Header bg="navy.7" p="1rem 1.25rem">
            <Modal.Title c="white" fw="700" fz="lg">
              Extract CV
            </Modal.Title>
            <Modal.CloseButton c="white" />
          </Modal.Header>

          <Stack p="1.25rem" gap="1rem" align="center">
            <Text fz="sm" c="navy.7" ta="center">
              Extract information from the CV to your profile.
            </Text>

            <Text fz="sm" fw="600" c="navy.7">
              Upload CV
            </Text>

            <Box
              w="100%"
              maw={220}
              p="1.25rem"
              bdrs="md"
              style={{
                border: "1px dashed var(--mantine-color-navy-4)",
                backgroundColor: "var(--mantine-color-gray-0)",
              }}
            >
              <Stack align="center" gap="0.75rem">
                <IconFileText
                  size={32}
                  stroke={1.5}
                  color="var(--mantine-color-navy-7)"
                />
                <FileButton onChange={handleUpload} accept="application/pdf">
                  {(props) => (
                    <Button {...props} bg="navy.7" radius="xl" size="sm">
                      Upload
                    </Button>
                  )}
                </FileButton>
              </Stack>
            </Box>

            {file ? (
              <Group gap="6" wrap="nowrap" maw="100%">
                <IconFileText size={14} color="var(--mantine-color-dimmed)" />
                <Text fz="xs" c="dimmed" truncate>
                  {file.name}
                </Text>
              </Group>
            ) : null}

            <Text fz="xs" c="dimmed">
              Format: PDF
            </Text>
          </Stack>

          <Group justify="flex-end" p="0 1.25rem 1.25rem">
            <Button
              bg="navy.7"
              radius="md"
              disabled={!file || extractMutation.isPending}
              onClick={handleExtract}
              loading={extractMutation.isPending}
            >
              Extract
            </Button>
          </Group>
        </Modal.Content>
      </Modal.Root>
    );
  }

  // Screen 2: Review & Edit
  return (
    <Modal.Root opened={opened} onClose={handleClose} size="500px" centered>
      <Modal.Overlay />
      <Modal.Content bdrs="lg">
        <Modal.Header bg="navy.7" p="1rem 1.25rem">
          <Modal.Title c="white" fw="700" fz="lg">
            {successMessage ? "Resume Extracted" : "Review Extracted Data"}
          </Modal.Title>
          <Modal.CloseButton c="white" />
        </Modal.Header>

        <Stack p="1.25rem" gap="1.5rem">
          {successMessage ? (
            <Stack align="center" gap="0.5rem">
              <Text c="green.7" fw="600" ta="center">
                Skills and research areas updated successfully
              </Text>
              <Text fz="sm" c="dimmed" ta="center">
                Your profile has been updated with the extracted information.
              </Text>
            </Stack>
          ) : (
            <>
              <Stack gap="1rem">
                <Stack gap="0.5rem">
                  <Text fw="600" fz="sm" c="navy.7">
                    SKILLS
                  </Text>
                  <TagsInput
                    placeholder="Edit skills or add more..."
                    value={editedData?.skills ?? []}
                    onChange={(values) =>
                      setEditedData((prev) => ({
                        ...prev!,
                        skills: values,
                      }))
                    }
                    radius="md"
                  />
                </Stack>

                <Stack gap="0.5rem">
                  <Text fw="600" fz="sm" c="navy.7">
                    RESEARCH AREAS
                  </Text>
                  <TagsInput
                    placeholder="Edit research areas or add more..."
                    value={editedData?.researchAreas ?? []}
                    onChange={(values) =>
                      setEditedData((prev) => ({
                        ...prev!,
                        researchAreas: values,
                      }))
                    }
                    radius="md"
                  />
                </Stack>
              </Stack>
            </>
          )}
        </Stack>

        {successMessage ? (
          <Group justify="flex-end" p="0 1.25rem 1.25rem">
            <Button bg="navy.7" radius="md" onClick={handleClose}>
              Done
            </Button>
          </Group>
        ) : (
          <Group justify="flex-end" gap="sm" p="0 1.25rem 1.25rem">
            <Button
              variant="outline"
              radius="md"
              onClick={() => {
                setExtractedData(null);
                setEditedData(null);
                setFile(null);
              }}
            >
              Back
            </Button>
            <Button
              bg="navy.7"
              radius="md"
              onClick={handleConfirm}
              loading={confirmMutation.isPending}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? (
                <Group gap="sm">
                  <Loader size="xs" color="white" />
                  <span>Updating...</span>
                </Group>
              ) : (
                "Confirm"
              )}
            </Button>
          </Group>
        )}
      </Modal.Content>
    </Modal.Root>
  );
}