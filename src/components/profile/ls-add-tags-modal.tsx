"use client";

import {
  Box,
  Button, Combobox, Divider, Group, Modal, Pill, PillsInput,
  ScrollArea, Stack, Text, useCombobox,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useMemo, useState } from "react";
import { useTagSearch } from "./use-profile-search";
import { useUserProfile, useUpdateDeclaredTags } from "./use-profile";
import type { DeclaredTagValue } from "@/lib/validations/profile";
import { IconSparklesFilled, IconTags } from "@tabler/icons-react";
import { MAX_PROFILE_TAGS } from "@/lib/constants/profile";

export interface LSAddTagsModalProps {
  opened: boolean;
  onClose: () => void;
  userId: string;
}

export function LSAddTagsModal({ opened, onClose, userId }: LSAddTagsModalProps) {
  const { data: profile } = useUserProfile(userId);
  const [tags, setTags] = useState<DeclaredTagValue[]>([]);
  const updateTags = useUpdateDeclaredTags(userId, onClose);

  useEffect(() => {
    if (opened) setTags(profile?.declared_tags ?? []);
  }, [opened, profile]);

  return (
    <Modal.Root opened={opened} onClose={onClose} centered size="lg">
      <Modal.Overlay />
      <Modal.Content>
        <Modal.Header>
          <Group align="flex-start" justify="space-between" w="100%">
            <Modal.Title>
              <Group>
                <Box bg="var(--ls-icon-badge-bg)" c="var(--ls-icon-badge-color)" bdrs="md" p="8">
                  <IconTags />
                </Box>
                <Stack gap="0">
                  <Text fw="700">Add Research Areas</Text>
                  <Text fz="xs" c="dimmed">
                    Find your research areas, or add your own
                  </Text>
                </Stack>
              </Group>
            </Modal.Title>
            <Modal.CloseButton />
          </Group>
        </Modal.Header>

        <Modal.Body>
          <Stack gap="lg">
            <LSDeclaredTagsInput value={tags} onChange={setTags} />
            <Group justify="flex-end">
              <Button variant="default" onClick={onClose}>Cancel</Button>
              <Button
                onClick={() => updateTags.mutate({ tags })}
                loading={updateTags.isPending}
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

interface LSDeclaredTagsInputProps {
  value: DeclaredTagValue[];
  onChange: (next: DeclaredTagValue[]) => void;
}

function LSDeclaredTagsInput({ value, onChange }: LSDeclaredTagsInputProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [search, setSearch] = useState("");
  const [debounced] = useDebouncedValue(search, 300);
  const { data: results = [], isFetching } = useTagSearch(debounced);

  const trimmed = search.trim();
  const atMax = value.length >= MAX_PROFILE_TAGS;
  const isSettled = search === debounced && !isFetching;

  const takenNames = useMemo(
    () => new Set(value.map((t) => t.name.toLowerCase())),
    [value],
  );

  const options = results
    .filter((r) => !takenNames.has(r.name.toLowerCase()))
    .map((r) => (
      <Combobox.Option value={String(r.id)} key={r.id}>
        {r.name}
      </Combobox.Option>
    ));

  const hasExactMatch =
    takenNames.has(trimmed.toLowerCase()) ||
    results.some((r) => r.name.toLowerCase() === trimmed.toLowerCase());

  const canCreate = trimmed.length >= 2 && isSettled && !hasExactMatch && !atMax;

  const handleSubmit = (optionValue: string) => {
    if (optionValue === "$create") {
      onChange([...value, { id: null, name: trimmed }]);
      setSearch("");
      combobox.closeDropdown();
      return;
    }
    const found = results.find((r) => String(r.id) === optionValue);
    if (found) {
      onChange([...value, { id: found.id, name: found.name }]);
      setSearch("");
      combobox.closeDropdown();
    }
  };

  const remove = (target: DeclaredTagValue) =>
    onChange(value.filter((t) => !(t.id === target.id && t.name === target.name)));

  return (
    <Stack gap="xs">
      <Combobox store={combobox} onOptionSubmit={handleSubmit} shadow="md">
        <Combobox.DropdownTarget>
          <PillsInput
            label="Research Areas"
            rightSection={<Text fz="xs" c="dimmed" pr={4}>{value.length}/{MAX_PROFILE_TAGS}</Text>}
            onClick={() => combobox.openDropdown()}
          >
            <Pill.Group>
              {value.map((tag) => (
                <Pill
                  key={tag.id ?? `custom:${tag.name}`}
                  withRemoveButton
                  onRemove={() => remove(tag)}
                  bg={tag.id === null ? "gray.2" : "blue.0"}
                  c={tag.id === null ? "navy.7" : "indigo.9"}
                >
                  <Group gap={4} wrap="nowrap">
                    {tag.id === null && <IconSparklesFilled size='1rem' opacity={0.6} />}
                    <span>{tag.name}</span>
                  </Group>
                </Pill>
              ))}

              <Combobox.EventsTarget>
                <PillsInput.Field
                  value={search}
                  disabled={atMax}
                  placeholder={
                    atMax ? "Limit reached" : value.length ? "" : "e.g. Structural Biology"
                  }
                  onFocus={() => combobox.openDropdown()}
                  onBlur={() => combobox.closeDropdown()}
                  onChange={(e) => {
                    combobox.openDropdown();
                    combobox.updateSelectedOptionIndex();
                    setSearch(e.currentTarget.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !search && value.length) {
                      e.preventDefault();
                      remove(value[value.length - 1]);
                    }
                  }}
                />
              </Combobox.EventsTarget>
            </Pill.Group>
          </PillsInput>
        </Combobox.DropdownTarget>

        <Combobox.Dropdown>
          <Combobox.Options>
            <Stack gap='4'>
              <ScrollArea.Autosize mah={220} type="scroll">
                {options}
                {!options.length && (
                  <Combobox.Empty>
                    {trimmed.length < 2
                      ? "Type to search research areas"
                      : !isSettled
                        ? "Searching…"
                        : "No matching research areas"}
                  </Combobox.Empty>
                )}
              </ScrollArea.Autosize>

              {canCreate && (
                <>
                  <Divider/>
                  <Combobox.Option value="$create">
                    <Text fz="sm">+ Add <b>“{trimmed}”</b> as a custom area</Text>
                  </Combobox.Option>
                </>
              )}
            </Stack>
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </Stack>
  );
}