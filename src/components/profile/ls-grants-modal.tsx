"use client";

import {
  Box,
  Button,
  Collapse,
  Group,
  Modal,
  NumberInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconFileImport, IconPlus, IconReceipt } from "@tabler/icons-react";
import { useState } from "react";

export interface LSGrantsModalProps {
  opened: boolean;
  onClose: () => void;
}

interface GrantEntry {
  grantName: string;
  agency: string;
  startYear: number | string;
  endYear: number | string;
}

const emptyGrant = (): GrantEntry => ({
  grantName: "",
  agency: "",
  startYear: "",
  endYear: "",
});

export function LSGrantsModal({ opened, onClose }: LSGrantsModalProps) {
  const [showForm, setShowForm] = useState(false);
  const [grant, setGrant] = useState<GrantEntry>(emptyGrant());

  const handleClose = () => {
    setShowForm(false);
    setGrant(emptyGrant());
    onClose();
  };

  return (
    <Modal.Root opened={opened} onClose={handleClose} centered size="lg">
      <Modal.Overlay />
      <Modal.Content>
        <Modal.Header>
          <Group align="flex-start" justify="space-between" w="100%">
            <Modal.Title>
              <Group>
                <Box bg="navy.3" bdrs="md" p="8">
                  <IconReceipt />
                </Box>
                <Stack gap="0">
                  <Text fw="700">Grants & Funding</Text>
                  <Text fz="xs" c="dimmed">
                    Import or manually add your grants
                  </Text>
                </Stack>
              </Group>
            </Modal.Title>
            <Modal.CloseButton />
          </Group>
        </Modal.Header>

        <Modal.Body>
          <Stack gap="lg">

            {/* Import + Manual buttons */}
            <Group>
              <Button
                variant="light"
                leftSection={<IconFileImport size="1rem" />}
              >
                Import Grants
              </Button>
              <Button
                variant="outline"
                leftSection={<IconPlus size="1rem" />}
                onClick={() => setShowForm((v) => !v)}
              >
                Add Manually
              </Button>
            </Group>

            {/* Manual entry form, only shows when Add Manually is clicked */}
            <Collapse in={showForm}>
              <Stack gap="sm">
                <TextInput
                  label="Grant Name"
                  value={grant.grantName}
                  onChange={(e) => setGrant({ ...grant, grantName: e.currentTarget.value })}
                />
                <TextInput
                  label="Funding Agency"
                  value={grant.agency}
                  onChange={(e) => setGrant({ ...grant, agency: e.currentTarget.value })}
                />
                <Group grow>
                  <NumberInput
                    label="Start Year"
                    value={grant.startYear}
                    onChange={(v) => setGrant({ ...grant, startYear: v })}
                  />
                  <NumberInput
                    label="End Year"
                    value={grant.endYear}
                    onChange={(v) => setGrant({ ...grant, endYear: v })}
                  />
                </Group>

                <Group justify="flex-end">
                  <Button variant="default" onClick={() => { setShowForm(false); setGrant(emptyGrant()); }}>
                    Cancel
                  </Button>
                  <Button onClick={() => { setShowForm(false); setGrant(emptyGrant()); }}>
                    Add Grant
                  </Button>
                </Group>
              </Stack>
            </Collapse>

          </Stack>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}