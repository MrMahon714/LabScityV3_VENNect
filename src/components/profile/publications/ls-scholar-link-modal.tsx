"use client";

import {
  Box,
  Button,
  Modal,
  Group,
  Stack,
  Text,
  TextInput,
  Card,
  Anchor,
  Center,
  Divider,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import ScholarInfo from "./ls-scholar-info";
import { useForm } from "@mantine/form";
import { IconBrandGoogle } from "@tabler/icons-react";

type LSScholarLinkerProps = {
  userId: string;
};

export default function LSScholarLinker({ userId }: LSScholarLinkerProps) {
  const [opened, { open, close }] = useDisclosure(false);

  const form = useForm({
    initialValues: { scholarId: "" },
    validate: {
      scholarId: (val) =>
        val.trim().length === 0 ? "Please enter a Google Scholar ID" : null,
    },
    validateInputOnBlur: true,
  });

  const handleSubmit = form.onSubmit((vals) => {
    // TODO: wire up to backend API when ready
    console.log("Scholar ID submitted:", vals.scholarId);
  });

  return (
    <>
      <Modal.Root size="600" centered opened={opened} onClose={close}>
        <Modal.Overlay />
        <Modal.Content>
          <Modal.Header
            style={{ borderBottom: "1px solid var(--mantine-color-gray-4)" }}
          >
            <Group align="flex-start" justify="space-between" w="100%">
              <Modal.Title>
                <Group>
                  <Box bg="navy.3" bdrs="md" p="8">
                    <IconBrandGoogle />
                  </Box>
                  <Stack gap="0">
                    <Text fw="700">Add Research via Google Scholar</Text>
                    <Text fz="xs" c="dimmed">
                      Fetch your publications using your Google Scholar ID
                    </Text>
                  </Stack>
                </Group>
              </Modal.Title>
              <Modal.CloseButton size="40" />
            </Group>
          </Modal.Header>

          <Modal.Body pb="0" pt="md">
            <Stack gap="sm">
              <form onSubmit={handleSubmit}>
                <Stack>
                  <Card bg="navy.1" shadow="none" bd="none" bdrs={0}>
                    <Group wrap="nowrap">
                      <Text fz="sm" flex="1">
                        Enter your Scholar ID to import publications via Google Scholar. You can review each publication before adding it your profile.
                      </Text>
                      <Anchor
                        c="navy.6"
                        underline="always"
                        w="fit-content"
                        href="https://scholar.google.com"
                        size="sm"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open Google Scholar
                      </Anchor>
                      <ScholarInfo size='2rem' />
                    </Group>
                  </Card>

                  <Group>
                    <TextInput
                      flex="1"
                      placeholder="ABC123XYZ456"
                      key={form.key("scholarId")}
                      {...form.getInputProps("scholarId")}
                    />
                    <Button type="submit">Find Publications</Button>
                  </Group>
                </Stack>
              </form>

              <Divider color="gray.4" />

              <Center py="100">
                <Text size="sm" c="dimmed" ta="center">
                  Once you enter your Google Scholar ID, your publications will
                  appear here for review.
                </Text>
              </Center>
            </Stack>
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>

      <Button bg="gray.0" variant="outline" onClick={open}>
        Link with Google Scholar
      </Button>
    </>
  );
}