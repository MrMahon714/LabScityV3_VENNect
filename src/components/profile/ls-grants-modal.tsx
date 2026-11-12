"use client";

import {
  Box,
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconReceipt } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { useSaveGrants } from "./use-grants";

export interface LSGrantsModalProps {
  opened: boolean;
  onClose: () => void;
}

interface GrantEntry {
  grantName: string;
  agency: string;
  program: string;
  role: string;
  startYear: number | string;
  endYear: number | string;
}

const emptyGrant = (): GrantEntry => ({
  grantName: "",
  agency: "",
  program: "",
  role: "",
  startYear: "",
  endYear: "",
});

const toYearsAwarded = (start: number | string, end: number | string) => {
  const s = String(start).trim();
  const e = String(end).trim();
  if (s && e && s !== e) return `${s}-${e}`;
  return s || e || null;
};

//Manually add one grant
export function LSGrantsModal({ opened, onClose }: LSGrantsModalProps) {
  const [grant, setGrant] = useState<GrantEntry>(emptyGrant());
  const saveGrants = useSaveGrants();

  const canSubmit = grant.grantName.trim() !== "" && grant.agency.trim() !== "";

  const handleClose = () => {
    if (saveGrants.isPending) return;
    setGrant(emptyGrant());
    onClose();
  };

  const handleAdd = async () => {
    if (!canSubmit) return;
    try {
      const res = await saveGrants.mutateAsync([
        {
          title: grant.grantName,
          grantingAgency: grant.agency,
          program: grant.program,
          role: grant.role,
          yearsAwarded: toYearsAwarded(grant.startYear, grant.endYear),
        },
      ]);
      notifications.show({
        color: res.inserted > 0 ? "green" : "yellow",
        message: res.inserted > 0 ? "Grant added!" : "This grant is already on your profile",
      });
      setGrant(emptyGrant());
      onClose();
    } catch {}
  };

  return (
    <Modal.Root opened={opened} onClose={handleClose} centered size="lg">
      <Modal.Overlay />
      <Modal.Content>
        <Modal.Header>
          <Group align="flex-start" justify="space-between" w="100%">
            <Modal.Title>
              <Group>
                <Box bg="var(--ls-icon-badge-bg)" c="var(--ls-icon-badge-color)" bdrs="md" p="8">
                  <IconReceipt />
                </Box>
                <Stack gap="0">
                  <Text fw="700">Grants & Funding</Text>
                  <Text fz="xs" c="dimmed">
                    Add a grant manually, or use Extract CV to import them
                  </Text>
                </Stack>
              </Group>
            </Modal.Title>
            <Modal.CloseButton />
          </Group>
        </Modal.Header>

        <Modal.Body>
          <Stack gap="sm">
            <TextInput
              label="Grant Name"
              required
              value={grant.grantName}
              onChange={(e) => setGrant({ ...grant, grantName: e.currentTarget.value })}
            />
            <TextInput
              label="Funding Agency"
              required
              value={grant.agency}
              onChange={(e) => setGrant({ ...grant, agency: e.currentTarget.value })}
            />
            <Group grow>
              <TextInput
                label="Program"
                placeholder="e.g. CAREER"
                value={grant.program}
                onChange={(e) => setGrant({ ...grant, program: e.currentTarget.value })}
              />
              <TextInput
                label="Role"
                placeholder="e.g. PI, Co-PI"
                value={grant.role}
                onChange={(e) => setGrant({ ...grant, role: e.currentTarget.value })}
              />
            </Group>
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

            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={handleClose} disabled={saveGrants.isPending}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={!canSubmit} loading={saveGrants.isPending}>
                Add Grant
              </Button>
            </Group>
          </Stack>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}