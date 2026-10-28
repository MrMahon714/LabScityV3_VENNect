"use client";

import { Box, Group, Input, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconLock, IconWorld } from "@tabler/icons-react";

export interface LSPrivacyPickerProps {
  value: "public" | "private";
  onChange: (value: "public" | "private") => void;
  error?: string;
}

const OPTIONS = [
  {
    value: "public" as const,
    label: "Public",
    description:
      "Anyone can find this group in Discover and join it. Any member can invite people.",
    icon: IconWorld,
  },
  {
    value: "private" as const,
    label: "Private",
    description:
      "Invite only. Hidden from Discover, and only admins can invite people.",
    icon: IconLock,
  },
];

/*modal to choose between public or private during group creation*/
export function LSPrivacyPicker({ value, onChange, error }: LSPrivacyPickerProps) {
  return (
    <Input.Wrapper label="Privacy" error={error}>
      <Stack gap="xs" mt={4}>
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          const Icon = option.icon;
          return (
            <UnstyledButton
              key={option.value}
              onClick={() => onChange(option.value)}
              aria-pressed={selected}
              p="sm"
              style={{
                borderRadius: "var(--mantine-radius-md)",
                border: selected
                  ? "1px solid var(--ls-tint-text)"
                  : "1px solid var(--ls-border)",
                background: selected ? "var(--ls-tint-bg)" : "transparent",
              }}
            >
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <Icon size={22} color="var(--ls-text-strong)" />
                <Box>
                  <Text fw={600} size="sm" c="var(--ls-text-strong)">
                    {option.label}
                  </Text>
                  <Text size="xs" c="var(--ls-text-muted)">
                    {option.description}
                  </Text>
                </Box>
              </Group>
            </UnstyledButton>
          );
        })}
      </Stack>
    </Input.Wrapper>
  );
}
