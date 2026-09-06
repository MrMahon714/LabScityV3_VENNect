'use client';

import {
  Box,
  Button,
  FileButton,
  Group,
  Modal,
  Stack,
  Text,
} from "@mantine/core";
import { IconFileText } from "@tabler/icons-react";
import { useState } from "react";

//Extract Resume modal is static.
export default function LSExtractResumeModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);

  const handleClose = () => {
    setFile(null);
    onClose();
  };

  const handleUpload = (selected: File | null) => {
    setFile(selected);
    console.log("Resume selected (not yet sent to backend):", selected?.name);
  };

  return (
    <Modal.Root opened={opened} onClose={handleClose} size="440px" centered>
      <Modal.Overlay />
      <Modal.Content bdrs="lg">
        <Modal.Header bg="navy.7" p="1rem 1.25rem">
          <Modal.Title c="white" fw="700" fz="lg">
            Extract Resume
          </Modal.Title>
          <Modal.CloseButton c="white" />
        </Modal.Header>

        <Stack p="1.25rem" gap="1rem" align="center">
          <Text fz="sm" c="navy.7" ta="center">
            Extract information from the resume to your profile.
          </Text>

          <Text fz="sm" fw="600" c="navy.7">
            Upload Resume
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

       { /* onClick should send `file` to the extraction endpoint. */}
        <Group justify="flex-end" p="0 1.25rem 1.25rem">
          <Button
            bg="navy.7"
            radius="md"
            disabled={!file}
            onClick={() => {
              console.log("Extract clicked (not yet wired to backend):", file?.name);
            }}
          >
            Extract
          </Button>
        </Group>
      </Modal.Content>
    </Modal.Root>
  );
}