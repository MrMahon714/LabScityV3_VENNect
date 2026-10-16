"use client";

import {
  CheckIcon,
  Combobox,
  Group,
  Loader,
  Pill,
  PillsInput,
  useCombobox,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useRef, useState } from "react";
import {
  useSkillSearch,
  useTagSearch,
} from "@/components/profile/use-profile-search";
import {
  MAX_FILTER_CHIPS,
  MAX_FILTER_TEXT_LENGTH,
} from "@/lib/constants/matching";

//id comes from the database when picked from the list, and is null for a custom entry to match matchFiltersSchema.
export type ChipOption = { id: number | null; name: string };

type SearchResult = { id: number; name: string };

const CREATE_OPTION = "__create__";
const OTHER_OPTION = "__other__";
const SEARCH_DELAY_MS = 250;

const sameName = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

type SearchableChipSelectProps = {
  label: string;
  placeholder: string;
  value: ChipOption[];
  onChange: (value: ChipOption[]) => void;
  search: string;
  onSearchChange: (search: string) => void;
  options: ChipOption[];
  loading: boolean;
};

export function SearchableChipSelect({
  label,
  placeholder,
  value,
  onChange,
  search,
  onSearchChange,
  options: rawOptions,
  loading,
}: SearchableChipSelectProps) {

  const options = rawOptions.filter(
    (option): option is SearchResult => option.id !== null,
  );

  const inputRef = useRef<HTMLInputElement>(null);

  const [typingOther, setTypingOther] = useState(false);

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setTypingOther(false);
    },
  });

  const typed = search.trim();
  const isFull = value.length >= MAX_FILTER_CHIPS;
  const isChosen = (name: string) =>
    value.some((chip) => sameName(chip.name, name));
  const exactMatch = options.find((option) => sameName(option.name, typed));
  const canAddCustom =
    !isFull && typed.length > 0 && !exactMatch && !isChosen(typed);

  const addChip = (chip: ChipOption) => {
    if (isFull || isChosen(chip.name)) return;
    onChange([...value, chip]);
  };

  const removeChip = (name: string) => {
    onChange(value.filter((chip) => !sameName(chip.name, name)));
  };

  //selected option and unselect it
  const toggleOption = (option: SearchResult) => {
    if (isChosen(option.name)) {
      removeChip(option.name);
    } else {
      addChip({ id: option.id, name: option.name });
    }
  };

  const addCustom = () => {
    if (!canAddCustom) return;
    addChip({ id: null, name: typed });
    onSearchChange("");
    setTypingOther(false);
  };

  const handleOptionSubmit = (optionValue: string) => {
    if (optionValue === CREATE_OPTION) {
      addCustom();
      return;
    }
    if (optionValue === OTHER_OPTION) {
      setTypingOther(true);
      onSearchChange("");
      inputRef.current?.focus();
      return;
    }
    const picked = options.find((option) => String(option.id) === optionValue);
    if (picked) toggleOption(picked);
  };

  return (
    <Combobox store={combobox} onOptionSubmit={handleOptionSubmit}>
      <Combobox.DropdownTarget>
        <PillsInput
          label={label}
          radius="md"
          onClick={() => combobox.openDropdown()}
          rightSection={loading ? <Loader size={14} /> : null}
        >
          <Pill.Group>
            {value.map((chip) => (
              <Pill
                key={chip.name}
                withRemoveButton
                onRemove={() => removeChip(chip.name)}
              >
                {chip.name}
              </Pill>
            ))}

            <Combobox.EventsTarget>
              <PillsInput.Field
                ref={inputRef}
                value={search}
                placeholder={
                  typingOther
                    ? "Type your own, then press Enter"
                    : value.length === 0
                      ? placeholder
                      : ""
                }
                maxLength={MAX_FILTER_TEXT_LENGTH}
                onFocus={() => combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
                onChange={(event) => {
                  onSearchChange(event.currentTarget.value);
                  combobox.openDropdown();
                  combobox.updateSelectedOptionIndex();
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    typed.length > 0 &&
                    combobox.getSelectedOptionIndex() === -1
                  ) {
                    event.preventDefault();
                    if (exactMatch) {
                      addChip({ id: exactMatch.id, name: exactMatch.name });
                      onSearchChange("");
                      setTypingOther(false);
                    } else {
                      addCustom();
                    }
                    return;
                  }

                  if (
                    event.key === "Backspace" &&
                    search.length === 0 &&
                    value.length > 0
                  ) {
                    event.preventDefault();
                    removeChip(value[value.length - 1].name);
                  }
                }}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown>
        <Combobox.Options mah={260} style={{ overflowY: "auto" }}>
          {typingOther ? (
            canAddCustom ? (
              <Combobox.Option value={CREATE_OPTION}>
                Add "{typed}"
              </Combobox.Option>
            ) : (
              <Combobox.Empty>Type your own, then press Enter</Combobox.Empty>
            )
          ) : (
            <>
              {options.map((option) => {
                const chosen = isChosen(option.name);
                return (
                  <Combobox.Option
                    value={String(option.id)}
                    key={option.id}
                    active={chosen}
                    disabled={isFull && !chosen}
                  >
                    <Group gap="xs" wrap="nowrap">
                      {chosen && <CheckIcon size={12} />}
                      <span>{option.name}</span>
                    </Group>
                  </Combobox.Option>
                );
              })}

              {canAddCustom && (
                <Combobox.Option value={CREATE_OPTION}>
                  Add "{typed}"
                </Combobox.Option>
              )}

              {!typed && !isFull && (
                <Combobox.Option value={OTHER_OPTION}>
                  Other (type your own)
                </Combobox.Option>
              )}

              {typed && !loading && options.length === 0 && !canAddCustom && (
                <Combobox.Empty>No matches</Combobox.Empty>
              )}

              {isFull && (
                <Combobox.Empty>
                  You can add up to {MAX_FILTER_CHIPS}
                </Combobox.Empty>
              )}
            </>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

type FilterProps = {
  value: ChipOption[];
  onChange: (value: ChipOption[]) => void;
};

//options come from /api/skills/search
export function SkillsFilter({ value, onChange }: FilterProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, SEARCH_DELAY_MS);
  const { data, isFetching } = useSkillSearch(debouncedSearch);

  return (
    <SearchableChipSelect
      label="Skills"
      placeholder="Select or search skills"
      value={value}
      onChange={onChange}
      search={search}
      onSearchChange={setSearch}
      options={data ?? []}
      loading={isFetching}
    />
  );
}

//options come from /api/tags/search
export function ExpertiseFilter({ value, onChange }: FilterProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, SEARCH_DELAY_MS);
  const { data, isFetching } = useTagSearch(debouncedSearch);

  return (
    <SearchableChipSelect
      label="Expertise"
      placeholder="Select or search research areas"
      value={value}
      onChange={onChange}
      search={search}
      onSearchChange={setSearch}
      options={data ?? []}
      loading={isFetching}
    />
  );
}