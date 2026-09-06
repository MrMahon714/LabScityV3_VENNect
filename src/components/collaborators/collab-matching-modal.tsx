'use client';

import {
  Avatar,
  Button,
  Card,
  Grid,
  Group,
  Loader,
  Modal,
  MultiSelect,
  Select,
  SimpleGrid,
  Stack,
  TagsInput,
  Text,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

/* ---------------------------------------------------------------------------
TODO(backend): PLACEHOLDER DATA — DELETE THIS ENTIRE BLOCK WHEN WIRING UP.

Everything between these markers is invented frontend-only data; nothing here comes from the database.

 Replacement plan:
 - EXPERTISE_OPTIONS / GRANT_OPTIONS -> replace each <Select data={...}>
 - PLACEHOLDER_RESULTS -> replace with the response from the search call in handleFindCollaborators(). 
 ------------------------------------------------------------------------- */

const EXPERTISE_OPTIONS = [
  "Quantum Computing",
  "Machine Learning",
  "Computational Biology",
  "Climate Modeling",
  "Bioinformatics",
  "Materials Science",
  "Neuroscience",
  "Systematics and Taxonomy",
  "Public Health",
  "Robotics",
];

const GRANT_OPTIONS = [
  "NSF Grant 12345",
  "NSF Grant 67890",
  "NIH R01",
  "NIH R21",
  "DOE Office of Science",
  "NASA ROSES",
];

const PLACEHOLDER_RESULTS = [
  {
    id: "placeholder-1",
    name: "Sarah Chen",
    title: "Assistant Professor",
    institution: "UC Berkeley",
    reason:
      "Matches skills [Deep Learning, Data Analysis] and has published on related keywords.",
  },
  {
    id: "placeholder-2",
    name: "Dr. David Lee",
    title: "Lead Researcher",
    institution: "MIT",
    reason:
      "Lead on a relevant grant [NSF Grant 67890] and expertise in [Quantum Computing].",
  },
];

//END OF PLACEHOLDER DATA

//Same source as the profile Add Skills modal. 
type SkillOption = { id: number; name: string };

export default function CollabMatchingModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {

  const [skillSearch, setSkillSearch] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillLabels, setSkillLabels] = useState<Record<string, string>>({});
  const [expertise, setExpertise] = useState<string | null>(null);
  const [grant, setGrant] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [products, setProducts] = useState<string[]>([]);

//Fetch skills from the backend as the user types
  const { data: skillOptions = [], isLoading: skillsLoading } = useQuery({
    queryKey: ["skill-search", skillSearch],
    queryFn: async () => {
      const res = await fetch(
        `/api/skills/search?q=${encodeURIComponent(skillSearch)}`,
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Skills search failed");
      return json.data as SkillOption[];
    },
    staleTime: 60 * 60 * 1000, 
    enabled: opened, 
  });

  const skillData = [
    ...skillOptions.map((s) => ({ value: String(s.id), label: s.name })),
    ...selectedSkills
      .filter((v) => !skillOptions.some((s) => String(s.id) === v))
      .map((v) => ({ value: v, label: skillLabels[v] ?? v })),
  ];

  //Replace the console.log with the real search request 
  const handleFindCollaborators = () => {
    const filters = {
      skillIds: selectedSkills.map(Number),
      expertise,
      grant,
      keywords,
      products,
    };
    console.log("VENNect filters (not yet wired to backend):", filters);
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
          {/*Skills (live data) ; Expertise and Grants (placeholder data) */}
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <MultiSelect
                label="Skills"
                placeholder={selectedSkills.length === 0 ? "Search skills..." : ""}
                data={skillData}
                value={selectedSkills}
                onChange={(values) => {
                  setSelectedSkills(values);
                  setSkillLabels((current) => {
                    const next = { ...current };
                    for (const v of values) {
                      const match = skillOptions.find((s) => String(s.id) === v);
                      if (match) next[v] = match.name;
                    }
                    return next;
                  });
                }}
                searchable
                searchValue={skillSearch}
                onSearchChange={setSkillSearch}
                rightSection={skillsLoading ? <Loader size={14} /> : undefined}
                nothingFoundMessage="No skills found"
                radius="md"
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 3.5 }}>
              <Select
                label="Expertise"
                placeholder="Select expertise"
                data={EXPERTISE_OPTIONS}
                value={expertise}
                onChange={setExpertise}
                searchable
                clearable
                radius="md"
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 3.5 }}>
              <Select
                label="Grants"
                placeholder="Select a grant"
                data={GRANT_OPTIONS}
                value={grant}
                onChange={setGrant}
                searchable
                clearable
                radius="md"
              />
            </Grid.Col>
          </Grid>

          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TagsInput
                label="Keywords or Titles in Publications"
                placeholder={keywords.length === 0 ? "Type and press Enter" : ""}
                value={keywords}
                onChange={setKeywords}
                radius="md"
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TagsInput
                label="Products"
                placeholder={products.length === 0 ? "Type and press Enter" : ""}
                value={products}
                onChange={setProducts}
                radius="md"
              />
            </Grid.Col>
          </Grid>

          <Button
            fullWidth
            bg="navy.7"
            radius="md"
            size="md"
            onClick={handleFindCollaborators}
          >
            Find my Collaborators
          </Button>

          <Stack gap="0.75rem">
            <Text fw="600" fz="md">
              Results
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {PLACEHOLDER_RESULTS.map((person) => (
                <Card
                  key={person.id}
                  bd="1px solid gray.3"
                  bdrs="0.75rem"
                  p="1rem"
                  c="navy.7"
                >
                  <Group gap="0.875rem" wrap="nowrap" align="flex-start" mb="0.75rem">
                    <Avatar size="48" radius="xl" bg="gray.2" />
                    <Stack gap="2" miw={0}>
                      <Text fw="600" fz="0.875rem" lh="1.25rem">
                        {person.name}
                      </Text>
                      <Text fz="0.75rem" c="dimmed" lh="1.125rem">
                        {person.title}
                      </Text>
                      <Text fz="0.75rem" c="dimmed" lh="1.125rem">
                        {person.institution}
                      </Text>
                    </Stack>
                  </Group>
                  <Text fw="600" fz="0.75rem" mb="4px">
                    Matched for:
                  </Text>
                  <Text fz="0.75rem" lh="1.25rem">
                    Chosen because: {person.reason}
                  </Text>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        </Stack>
      </Modal.Content>
    </Modal.Root>
  );
}