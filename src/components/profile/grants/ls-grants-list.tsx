'use client';

import { Button, Center, Divider, Group, Loader, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconReceiptOff } from "@tabler/icons-react";
import { useAuthContext } from "@/components/auth/auth-provider";
import { useUserProfile } from "../use-profile";
import { useMyGrants } from "../use-grants";
import { LSGrantsModal } from "../ls-grants-modal";
import LSGrantCard from "./ls-grant-card";

export default function LSGrantsList({ userId }: { userId: string }) {
  const { user, loading: userLoading } = useAuthContext();
  const isOwner = user?.id === userId;

  const { data: profile } = useUserProfile(userId);
  const { data: grants = [], isLoading, isError } = useMyGrants({ enabled: isOwner });

  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);

  if (userLoading || (isOwner && isLoading)) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (isOwner && isError) {
    return (
      <Text ta="center" c="red" py="xl">
        Failed to load grants...
      </Text>
    );
  }

  const shown = isOwner ? grants : [];

  return (
    <Stack w="100%" maw="800">
      <Group wrap="nowrap">
        <Stack gap="0">
          <Text fw="bold">Grants</Text>
          <Text size="xs" c="dimmed">
            {shown.length} grants{" "}
            {isOwner ? "on your profile" : `from ${profile?.first_name} ${profile?.last_name}`}
          </Text>
        </Stack>
        {isOwner && (
          <Group flex="1" justify="right" wrap="nowrap">
            <Button onClick={openAdd} rightSection={<IconPlus size="1rem" />}>
              Add Grant
            </Button>
            <LSGrantsModal opened={addOpened} onClose={closeAdd} />
          </Group>
        )}
      </Group>

      <Divider color="gray.4" />

      <Stack>
        {shown.length > 0 ? (
          shown.map((grant) => <LSGrantCard key={grant.id} grant={grant} />)
        ) : (
          <Stack justify="center" align="center">
            <IconReceiptOff color="var(--mantine-color-dimmed)" size={64} stroke={1} />
            <Text ta="center" c="dimmed">
              No Grants Found...
            </Text>
            {isOwner && (
              <Text ta="center" c="dimmed" fz="sm">
                Add a grant manually or use Extract CV to import them.
              </Text>
            )}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}