import {
  Avatar,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  MultiSelect,
  Select,
  SimpleGrid,
  Stack,
  TagsInput,
  Text,
} from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  CAREER_STAGES,
  CAREER_STAGE_LABELS,
  MATCHING_PRODUCT_TYPES,
  MAX_FILTER_CHIPS,
  MAX_FILTER_TEXT_LENGTH,
  RECENT_PUBLICATION_YEARS,
} from "@/lib/constants/matching";
import { PRODUCT_TYPE_LABELS } from "@/lib/constants/product";
import type { GetCollaboratorsResult } from "@/lib/types/collab";
import type {
  MatchFilters,
  MatchFiltersInput,
} from "@/lib/validations/matching";
import {
  type ChipOption,
  ExpertiseFilter,
  SkillsFilter,
} from "./searchable-chip-select";
import { LocationFilter } from "./location-filter";

//Filter options
const PRODUCT_TYPE_OPTIONS = MATCHING_PRODUCT_TYPES.map((type) => ({
  value: type,
  label: PRODUCT_TYPE_LABELS[type],
}));

const CAREER_STAGE_OPTIONS = CAREER_STAGES.map((stage) => ({
  value: stage,
  label: CAREER_STAGE_LABELS[stage],
}));

const RECENT_PUBLICATION_OPTIONS = [
  { value: "any", label: "Any" },
  ...RECENT_PUBLICATION_YEARS.map((years) => ({
    value: String(years),
    label: years === 1 ? "Last 1 year" : `Last ${years} years`,
  })),
];

export default function CollabMatchingModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  
  //searchable dropdown from /api/skills/ and /api/tags/.
  const [skills, setSkills] = useState<ChipOption[]>([]);
  const [expertise, setExpertise] = useState<ChipOption[]>([]);
  const [publicationKeywords, setPublicationKeywords] = useState<string[]>([]);
  const [productTypes, setProductTypes] = useState<MatchFilters["productTypes"]>([]);
  const [productKeywords, setProductKeywords] = useState<string[]>([]);
  const [recentYears, setRecentYears] = useState<MatchFilters["recentYears"]>(null);
  const [careerStages, setCareerStages] = useState<MatchFilters["careerStages"]>([]);
  const [location, setLocation] = useState("");

  //sends the filters to POST /api/collaborators and stores the results
  const findCollaborators = useMutation({
    mutationFn: async (filters: MatchFiltersInput) => {
      const res = await fetch("/api/collaborators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Could not load collaborators");
      }
      return json as GetCollaboratorsResult[];
    },
  });

  const results = findCollaborators.data ?? [];

  const handleFindCollaborators = () => {
    findCollaborators.mutate({
      skills,
      expertise,
      publicationKeywords,
      productTypes,
      productKeywords,
      recentYears,
      careerStages,
      location,
    });
  };

  return (
    <Modal.Root opened={opened} onClose={onClose} size="900px">
      <Modal.Overlay />
      <Modal.Content bdrs="lg">
        <Modal.Header p="0">
          <Group
            p="1rem 1.5rem"
            w="100%"
            wrap="nowrap"
            justify="space-between"
            style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}
            gap="0"
          >
            <Stack gap="2">
              <Text fw="600" fz="lg" lh="1.5rem">
                Recommended Collaborators
              </Text>
              <Text c="dimmed" fz="sm" lh="1rem">
                Matching Algorithm
              </Text>
            </Stack>
            <Modal.CloseButton />
          </Group>
        </Modal.Header>

        <Stack p="1.5rem" gap="1rem">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <SkillsFilter value={skills} onChange={setSkills} />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <ExpertiseFilter value={expertise} onChange={setExpertise} />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TagsInput
                label="Keywords or Titles in Publications"
                placeholder={publicationKeywords.length === 0 ? "Type and press Enter" : ""}
                value={publicationKeywords}
                onChange={setPublicationKeywords}
                maxTags={MAX_FILTER_CHIPS}
                maxLength={MAX_FILTER_TEXT_LENGTH}
                radius="md"
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Recent Publications"
                data={RECENT_PUBLICATION_OPTIONS}
                value={recentYears === null ? "any" : String(recentYears)}
                onChange={(value) =>
                  setRecentYears(
                    !value || value === "any"
                      ? null
                      : (Number(value) as NonNullable<MatchFilters["recentYears"]>),
                  )
                }
                allowDeselect={false}
                radius="md"
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <MultiSelect
                label="Product Type"
                placeholder={productTypes.length === 0 ? "Select product types" : ""}
                data={PRODUCT_TYPE_OPTIONS}
                value={productTypes}
                onChange={(values) =>
                  setProductTypes(values as MatchFilters["productTypes"])
                }
                clearable
                radius="md"
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TagsInput
                label="Product Keywords"
                placeholder={productKeywords.length === 0 ? "Type and press Enter" : ""}
                value={productKeywords}
                onChange={setProductKeywords}
                maxTags={MAX_FILTER_CHIPS}
                maxLength={MAX_FILTER_TEXT_LENGTH}
                radius="md"
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <MultiSelect
                label="Career Stage"
                placeholder={careerStages.length === 0 ? "Select career stages" : ""}
                data={CAREER_STAGE_OPTIONS}
                value={careerStages}
                onChange={(values) =>
                  setCareerStages(values as MatchFilters["careerStages"])
                }
                clearable
                radius="md"
              />
            </Grid.Col>
            
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <LocationFilter value={location} onChange={setLocation} />
            </Grid.Col>
          </Grid>

          <Button
            fullWidth
            bg="navy.7"
            radius="md"
            size="md"
            onClick={handleFindCollaborators}
            loading={findCollaborators.isPending}
          >
            Find my Collaborators
          </Button>

          <Stack gap="0.75rem">
            <Text fw="600" fz="md">
              Results
            </Text>
            
            {findCollaborators.isIdle && (
              <Text c="dimmed" fz="sm">
                Set your filters and click Find my Collaborators to see matches.
              </Text>
            )}

            {findCollaborators.isError && (
              <Text c="red" fz="sm">
                {findCollaborators.error?.message}
              </Text>
            )}

            {findCollaborators.isSuccess && results.length === 0 && (
              <Text c="dimmed" fz="sm">
                No collaborators matched these filters. Try removing a few.
              </Text>
            )}

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {results.map((person) => (
                <Card
                  key={person.profile_user_id}
                  bd="1px solid gray.3"
                  bdrs="0.75rem"
                  p="1rem"
                  c="navy.7"
                  pos="relative"
                  shadow="none"
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "1rem",
                      left: "1rem",
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      backgroundColor: "var(--mantine-color-blue-0)",
                      border: "2px solid var(--mantine-color-blue-3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 2,
                      boxShadow: "none",
                    }}
                  >
                    <Text fw="600" fz="0.875rem" c="navy.7">
                      {Math.round(person.match_percent)}%
                    </Text>
                  </div>

                  <Group gap="0.875rem" wrap="nowrap" align="flex-start" mb="0.75rem">
                    <Avatar size="48" radius="xl" bg="gray.2" />
                    <Stack gap="2" miw={0} style={{ flex: 1 }}>
                      <Text fw="600" fz="0.875rem" lh="1.25rem">
                        {person.first_name} {person.last_name}
                      </Text>
                      {person.occupation && (
                        <Text fz="0.75rem" c="dimmed" lh="1.125rem">
                          {person.occupation}
                        </Text>
                      )}
                      {person.workplace && (
                        <Text fz="0.75rem" c="dimmed" lh="1.125rem">
                          {person.workplace}
                        </Text>
                      )}
                    </Stack>
                  </Group>

                  {person.match_explanation && (
                    <>
                      <Text fw="600" fz="0.75rem" mb="4px">
                        Matched for:
                      </Text>
                      <Text fz="0.75rem" lh="1.25rem">
                        {person.match_explanation}
                      </Text>
                    </>
                  )}
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        </Stack>
      </Modal.Content>
    </Modal.Root>
  );
}