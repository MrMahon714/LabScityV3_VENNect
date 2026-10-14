"use client";

import { Autocomplete, Loader } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useMemo } from "react";
import { useLocationSearch } from "@/components/profile/use-profile-search";

type LocationFilterProps = {
  value: string;
  onChange: (value: string) => void;
};

export function LocationFilter({ value, onChange }: LocationFilterProps) {
  const [debouncedValue] = useDebouncedValue(value, 500);
  const { data, isFetching } = useLocationSearch(debouncedValue);

  const options = useMemo(
    () => [...new Set((data ?? []).map((result) => result.display_name))],
    [data],
  );

  return (
    <Autocomplete
      label="Location"
      placeholder="Search for a city or place..."
      data={options}
      value={value}
      onChange={onChange}
      rightSection={isFetching ? <Loader size="xs" /> : null}
      maxLength={200}
      radius="md"
    />
  );
}
