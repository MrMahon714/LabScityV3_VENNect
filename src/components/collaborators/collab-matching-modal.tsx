'use client';

import {
  Avatar,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  TagsInput,
  Text,
} from "@mantine/core";
import { useState } from "react";

/*PLACEHOLDER DATA*/

const PLACEHOLDER_RESULTS = [
  {
    id: "placeholder-1",
    name: "Sarah Chen",
    title: "Assistant Professor",
    institution: "UC Berkeley",
    matchPercentage: 87,
    reason:
      "Matches skills [Deep Learning, Data Analysis] and has published on related keywords.",
  },
];

//END OF PLACEHOLDER DATA

export default function CollabMatchingModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [expertise, setExpertise] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [products, setProducts] = useState<string[]>([]);

  const handleFindCollaborators = () => {
    const filters = {
      skills: selectedSkills,
      expertise,
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
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TagsInput
                label="Skills"
                placeholder={selectedSkills.length === 0 ? "Type and press Enter" : ""}
                value={selectedSkills}
                onChange={setSelectedSkills}
                radius="md"
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TagsInput
                label="Expertise"
                placeholder={expertise.length === 0 ? "Type and press Enter" : ""}
                value={expertise}
                onChange={setExpertise}
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
                label="Research Products (data sets)"
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
                      {person.matchPercentage}%
                    </Text>
                  </div>

                  <Group gap="0.875rem" wrap="nowrap" align="flex-start" mb="0.75rem">
                    <Avatar size="48" radius="xl" bg="gray.2" />
                    <Stack gap="2" miw={0} style={{ flex: 1 }}>
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