import { ActionIcon, Avatar, Badge, Box, Button, Card, Group, Menu, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCalendar, IconDots, IconTrash, IconUserStar } from "@tabler/icons-react";
import { Fragment } from "react";
import type { Grant } from "../use-grants";

const ICON_PROPS = { size: "0.85rem", color: "var(--mantine-color-indigo-8)" };

interface LSGrantCardProps {
  grant: Grant;
  isOwner: boolean;
  onDeleteClick?: () => void;
  isDeleting?: boolean;
}

export default function LSGrantCard({ grant, isOwner, onDeleteClick, isDeleting }: LSGrantCardProps) {
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const collaborators = grant.collaborators ?? [];
  const visible = collaborators.slice(0, 3);
  const overflow = collaborators.length - visible.length;

  const initials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return(
    <>
       {isOwner && (
        <Modal
          opened={confirmOpen}
          onClose={closeConfirm}
          title="Delete grant"
          centered
          closeOnClickOutside={!isDeleting}
          closeOnEscape={!isDeleting}
          withCloseButton={!isDeleting}
        >
          <Text size="sm" mb="md">
            Remove "{grant.title}" from your profile? This can't be undone.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" onClick={closeConfirm} disabled={isDeleting}>
              Cancel
            </Button>
            <Button color="red" onClick={onDeleteClick} disabled={isDeleting} loading={isDeleting}>
              Delete
            </Button>
          </Group>
        </Modal>
      )}
    <Card
      w="100%"
      p="0"
      bdrs="md"
      shadow="xs"
      style={{ border: "1px solid var(--mantine-color-gray-3)" }}
    >
      <Stack p="21">
        {/* Badges */}
        <Group justify="space-between" wrap="nowrap">
        <Group>
          {grant.role && (
            <Badge
              tt="none"
              bg="indigo.0"
              c="indigo.9"
              fw="500"
              fz="0.75rem"
              lh="1rem"
              leftSection={<IconUserStar {...ICON_PROPS} />}
            >
              {grant.role}
            </Badge>
          )}
          {grant.years_awarded && (
            <Badge
              tt="none"
              bg="indigo.0"
              c="indigo.9"
              fw="500"
              fz="0.75rem"
              lh="1rem"
              leftSection={<IconCalendar {...ICON_PROPS} />}
            >
              {grant.years_awarded}
            </Badge>
          )}
          </Group>

          {isOwner && (
            <Menu position="bottom-end" shadow="md">
              <Menu.Target>
                <ActionIcon bdrs="md" variant="subtle" size="lg" aria-label="Grant options">
                  <IconDots size="1.25rem" color="var(--mantine-color-navy-7)" />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item color="red" leftSection={<IconTrash size="1rem" />} onClick={openConfirm}>
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>

        <Text c="navy.7" fz="lg" fw="600" lh="1.625rem">
          {grant.title}
        </Text>

        <Stack gap="6">
          <Group gap="0.5rem" fz="sm" c="dimmed">
            <Box
              component="span"
              w="0.5rem"
              h="0.5rem"
              bg="gray.4"
              style={{ borderRadius: "50%", display: "inline-block" }}
            />
            {grant.granting_agency}
            {grant.program ? ` · ${grant.program}` : undefined}
          </Group>

          {/* Collaborators */}
          {visible.length > 0 && (
            <Box component="span" fz="sm">
              <Avatar.Group
                spacing={8}
                style={{ display: "inline-flex", verticalAlign: "middle", marginRight: "0.5rem" }}
              >
                {visible.map((name, i) => (
                  <Avatar key={`${name}-${i}`} size="sm" color="navy.7" bg="navy.7">
                    {initials(name)}
                  </Avatar>
                ))}
              </Avatar.Group>
              {visible.map((name, i) => (
                <Fragment key={`${name}-${i}`}>
                  {i > 0 && " · "}
                  {name}
                </Fragment>
              ))}
              {overflow > 0 && (
                <Text span c="dimmed" fz="sm">{` +${overflow} more`}</Text>
              )}
            </Box>
          )}
        </Stack>
      </Stack>
      </Card>
    </>
  );
}