// app/chat/page.tsx
import { Center, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconMessageCircle, IconMessages } from "@tabler/icons-react";

export default async function ChatIndexPage() {
  return (
    <Center
      h='100%'
      style={{
        background: "var(--ls-chat-bg)",
      }}
    >
      <Paper
        radius="md"
        p="xl"
        withBorder
        bg="var(--ls-empty-bg)"
        style={{ borderColor: "var(--ls-border)" }}
        maw={420}
      >
        <Stack align="center" gap="sm">
          <ThemeIcon
            size={64}
            radius="xl"
            variant="outline"
            color='navy.7'
            style={{ color: "var(--ls-text-strong)", borderColor: "var(--ls-text-strong)" }}
          >
            <IconMessages size={30} />
          </ThemeIcon>
          <Text size="xl" fw={700} c="var(--ls-text-strong)">
            Select a conversation
          </Text>
          <Text size="sm" c="gray.7" ta="center">
            Pick a contact, a group, or an existing message from the sidebar, or
            start a new message.
          </Text>
        </Stack>
      </Paper>
    </Center>
  );
}
