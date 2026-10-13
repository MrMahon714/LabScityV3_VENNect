import { Text, Box, Avatar, Group, Stack } from "@mantine/core";
import Link from "next/link";
import classes from "./ls-mini-profile.module.css";

export interface LSMiniProfileProps {
  posterName: string;
  posterEmail: string;
  posterProfilePicURL?: string;
  userId?: string;
}

export default function LSMiniProfile({
  posterName,
  posterEmail,
  posterProfilePicURL,
  userId,
}: LSMiniProfileProps) {
  const initials = posterName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  const content = (
    <Group gap={12} wrap="nowrap" align="center">
      <Avatar
        size="md"
        radius="xl"
        color="navy.7"
        bg={posterProfilePicURL ? undefined : "navy.7"}
        src={posterProfilePicURL || undefined}
      >
        {initials}
      </Avatar>
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Text c="var(--ls-text-strong)" size="md" fw={600} lineClamp={1}>
          {posterName}
        </Text>
        {
          posterEmail && 
          <Text c="dimmed" size="xs" lineClamp={1}>
            {posterEmail}
          </Text>
        }
      </Stack>
    </Group>
  );

  return userId ? (
    <Box component={Link} href={`/profile/${userId}`} className={classes.row}>
      {content}
    </Box>
  ) : (
    <Box className={classes.rowStatic}>{content}</Box>
  );
}