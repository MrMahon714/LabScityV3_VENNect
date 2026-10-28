import { Avatar, Badge, Box, Card, Group, Stack, Text } from "@mantine/core";
import { IconCalendar, IconUserStar } from "@tabler/icons-react";
import { Fragment } from "react";
import type { Grant } from "../use-grants";

const ICON_PROPS = { size: "0.85rem", color: "var(--mantine-color-indigo-8)" };

export default function LSGrantCard({ grant }: { grant: Grant }) {
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

  return (
    <Card
      w="100%"
      p="0"
      bdrs="md"
      shadow="xs"
      style={{ border: "1px solid var(--mantine-color-gray-3)" }}
    >
      <Stack p="21">
        {/* Badges */}
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

        {/* Title */}
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
  );
}