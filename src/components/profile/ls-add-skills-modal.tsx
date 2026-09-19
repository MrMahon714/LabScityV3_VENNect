"use client";

import {
  Box,
  Button,
  Combobox,
  Divider,
  Group,
  Modal,
  // Paper,
  Pill,
  PillsInput,
  ScrollArea,
  Stack,
  Text,
  // TextInput,
  useCombobox,
} from "@mantine/core";
import { useEffect, useMemo, /* useRef, */ useState } from "react";
import { useSkillSearch } from "./use-profile-search";
import { useDebouncedValue } from "@mantine/hooks";
import { useUpdateProfileSkills, useUserProfile } from "./use-profile";
import { IconSparkles, IconSparklesFilled, IconTool } from "@tabler/icons-react";
import { MAX_PROFILE_SKILLS } from "@/lib/constants/profile";
import { FileButton } from "@mantine/core";

export interface LSAddSkillsModalProps {
  opened: boolean;
  onClose: () => void;
  userId: string;
}

export function LSAddSkillsModal({ opened, onClose, userId }: LSAddSkillsModalProps) {
  const { data: profile } = useUserProfile(userId);
  const [skills, setSkills] = useState<SkillValue[]>([]);
  const updateSkills = useUpdateProfileSkills(userId, onClose);

  useEffect(() => {
    if (opened) setSkills(profile?.skills ?? []);
  }, [opened, profile]);

  return (
    <Modal.Root opened={opened} onClose={onClose} centered size="lg">
    <Modal.Overlay />
    <Modal.Content>
      <Modal.Header>
        <Group align="flex-start" justify="space-between" w="100%">
          <Modal.Title>
            <Group>
              <Box bg="navy.3" bdrs="md" p="8">
                <IconTool />
              </Box>
              <Stack gap="0">
                <Text fw="700">Add Skills</Text>
                <Text fz="xs" c="dimmed">
                  Search our skill list, or add your own
                </Text>
              </Stack>
            </Group>
          </Modal.Title>
          <Modal.CloseButton />
        </Group>
      </Modal.Header>

      <Modal.Body>
        <Stack gap="lg">
          <LSSkillsInput value={skills} onChange={setSkills} />
                        <Group justify="space-between">
              <FileButton
                onChange={(file) => console.log("Resume uploaded for Skills:", file)}
                accept=".pdf,.doc,.docx,.txt"
              >
                {(props) => (
                  <Button
                    {...props}
                    variant="subtle"
                    size="sm"
                    leftSection={<IconSparkles size="0.9rem" />}
                  >
                    Generate Skills From File
                  </Button>
                )}
              </FileButton>
              
              <Group>
                <Button variant="default" onClick={onClose}>Cancel</Button>
                <Button
                  onClick={() => updateSkills.mutate({ skills })}
                  loading={updateSkills.isPending}
                >
                  Save
                </Button>
              </Group>
            </Group>
        </Stack>
      </Modal.Body>
    </Modal.Content>
  </Modal.Root>
  );
}

export interface SkillValue {
  id: number | null;
  name: string;
  // description?: string;
}

export interface LSSkillsInputProps {
  value: SkillValue[];
  onChange: (next: SkillValue[]) => void;
}

export function LSSkillsInput({ value, onChange }: LSSkillsInputProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const { data: results = [], isFetching } = useSkillSearch(debouncedSearch);

  /*
   * type Draft = { index: number | null; name: string; description: string };
   * const [draft, setDraft] = useState<Draft | null>(null);
   * const draftRef = useRef<HTMLInputElement>(null);
   * const isDrafting = draft !== null;
   */

  const trimmed = search.trim();
  const atMax = value.length >= MAX_PROFILE_SKILLS;

  const takenNames = useMemo(
    () => new Set(value.map((s) => s.name.toLowerCase())),
    [value],
  );

  const options = results
    ?.filter((r) => !takenNames.has(r.name.toLowerCase()))
    .map((r) => (
      <Combobox.Option value={String(r.id)} key={r.id}>
        {r.name}
      </Combobox.Option>
    ));

  const hasExactMatch =
    takenNames.has(trimmed.toLowerCase()) ||
    results?.some((r) => r.name.toLowerCase() === trimmed.toLowerCase());

  const isSettled = search === debouncedSearch && !isFetching;
  const canCreate = trimmed.length >= 2 && !hasExactMatch && !atMax && isSettled;

  const beginCreate = (name: string) => {
    onChange([...value, { id: null, name }]);
    setSearch("");
    combobox.closeDropdown();
    // setDraft({ index: null, name, description: "" });
    // combobox.closeDropdown();
    // requestAnimationFrame(() => draftRef.current?.focus());
  };

  /*
   * const beginEdit = (index: number) => {
   *   const s = value[index];
   *   if (s.id !== null) return;                       // canonical: not editable
   *   setDraft({ index, name: s.name, description: s.description ?? "" });
   *   requestAnimationFrame(() => draftRef.current?.focus());
   * };
   *
   * const commitDraft = () => {
   *   if (!draft) return;
   *   const name = draft.name.trim();
   *   if (name.length < 2) return;
   *   const next = { id: null, name, description: draft.description.trim() };
   *   onChange(
   *     draft.index === null
   *       ? [...value, next]
   *       : value.map((s, i) => (i === draft.index ? next : s)),
   *   );
   *   setDraft(null);
   *   setSearch("");
   * };
   */

  const handleOptionSubmit = (optionValue: string) => {
    if (optionValue === "$create") {
      beginCreate(trimmed);
      return;
    }
    const found = results?.find((r) => String(r.id) === optionValue);
    if (found) {
      onChange([...value, { id: found.id, name: found.name }]);
      setSearch("");
      combobox.closeDropdown();
    }
  };

  const remove = (target: SkillValue) =>
    onChange(
      value.filter((s) => !(s.id === target.id && s.name === target.name)),
    );

  return (
    <Stack gap="xs">
      <Combobox store={combobox} onOptionSubmit={handleOptionSubmit} shadow="md">
        <Combobox.DropdownTarget>
          <PillsInput
            label="Skills"
            rightSection={
              <Text fz="xs" c="dimmed" pr={4}>
                {value.length}/{MAX_PROFILE_SKILLS}
              </Text>
            }
            onClick={() => combobox.openDropdown()}
            // onClick={() => !isDrafting && combobox.openDropdown()}
          >
            <Pill.Group>
              {value.map((skill, i) => (
                <Pill
                  key={skill.id ?? `custom:${skill.name}`}
                  withRemoveButton
                  onRemove={() => remove(skill)}
                  // onClick={() => beginEdit(i)}
                  // style={{ cursor: skill.id === null ? "pointer" : undefined }}
                  bg={skill.id === null ? "gray.2" : "blue.0"}
                  c={skill.id === null ? "navy.7" : "indigo.9"}
                >
                  <Group gap={4} wrap="nowrap">
                    {skill.id === null && <IconSparklesFilled size='1rem' opacity={0.6} />}
                    <span>{skill.name}</span>
                  </Group>
                </Pill>
              ))}

              <Combobox.EventsTarget>
                <PillsInput.Field
                  value={search}
                  disabled={atMax}
                  // disabled={atMax || isDrafting}
                  placeholder={
                    atMax
                      ? "Skill limit reached"
                      : value.length
                        ? ""
                        : "e.g. Mass Spectrometry"
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
            <ScrollArea.Autosize mah={200} type="scroll">
              {options}
              {!options.length && (
                <Combobox.Empty>
                  {trimmed.length < 2
                    ? "Type to search skills"
                    : !isSettled
                      ? "Searching…"
                      : "No matching skills"}
                </Combobox.Empty>
              )}
            </ScrollArea.Autosize>

            {canCreate && (
              <>
                <Divider />
                <Combobox.Option value="$create">
                  <Text fz="sm">+ Add <b>“{trimmed}”</b> as your own skill</Text>
                </Combobox.Option>
              </>
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>

      {/*
        * {draft && (
        *   <Paper withBorder p="sm" radius="md" bg="gray.0">
        *     <Stack gap="xs">
        *       <Text fz="xs" fw={600} c="dimmed">
        *         {draft.index === null ? "ADD YOUR OWN SKILL" : "EDIT SKILL"}
        *       </Text>
        *
        *       <TextInput
        *         ref={draftRef}
        *         label="Skill name"
        *         size="sm"
        *         value={draft.name}
        *         onChange={(e) =>
        *           setDraft({ ...draft, name: e.currentTarget.value })
        *         }
        *       />
        *
        *       <Textarea
        *         label="What is it?"
        *         description="A sentence or two. We use this to match you with collaborators."
        *         size="sm"
        *         autosize
        *         minRows={2}
        *         value={draft.description}
        *         onChange={(e) =>
        *           setDraft({ ...draft, description: e.currentTarget.value })
        *         }
        *         onKeyDown={(e) => { if (e.key === "Escape") setDraft(null); }}
        *       />
        *
        *       <Group gap="xs" justify="flex-end">
        *         <Button variant="subtle" size="xs" onClick={() => setDraft(null)}>
        *           Cancel
        *         </Button>
        *         <Button
        *           size="xs"
        *           disabled={draft.name.trim().length < 2}
        *           onClick={commitDraft}
        *         >
        *           {draft.index === null ? "Add skill" : "Save changes"}
        *         </Button>
        *       </Group>
        *     </Stack>
        *   </Paper>
        * )}
        */}
    </Stack>
  );
}