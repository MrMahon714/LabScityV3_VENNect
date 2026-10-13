"use client";

import {
  Avatar,
  Box,
  Button,
  Center,
  Drawer,
  Flex,
  Group,
  Menu,
  Modal,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconEdit,
  IconLogout,
  IconMenu2,
  IconMessageCircle,
  IconSettings,
  IconTrash,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/app/use-is-mobile";
import { useAuth } from "@/components/auth/use-auth";
import LSMiniProfileList from "@/components/profile/ls-mini-profile-list";
import { LSSpinner } from "@/components/ui/ls-spinner";
import type { User } from "@/lib/types/feed";
import { LSCreateGroupModal } from "./ls-create-group-modal";
import { LSEditGroupModal } from "./ls-edit-group-modal";
import { LSGroupFeed } from "./ls-group-feed";
import type { LSGroupLayoutProps } from "./ls-group-layout.types";
import { LSGroupSidebar } from "./ls-group-sidebar";
import { LSManageMembersModal } from "./ls-manage-members-modal";
import { useGroupLayout } from "./use-group-layout";

/**
 * Top-level client component for the Groups page.
 * Desktop: sidebar (left) + content (right).
 * Mobile: content only + hamburger drawer for the sidebar.
 */
export function LSGroupLayout(props: LSGroupLayoutProps) {
  const {
    activeGroupId,
    autoOpenCreateGroup,
    createGroupAvatarUploadUrlAction,
    createGroupAction,
    joinGroupAction,
    leaveGroupAction,
    deleteGroupAction,
    addMemberByEmailAction,
    inviteUsersToGroupAction,
    removeMemberAction,
    updateGroupAction,
    createPostAction,
    createPostImageUploadUrlAction,
    createCommentAction,
    createReportAction,
    likePostAction,
    likeCommentAction,
    updatePostAction,
  } = props;

  const isMobile = useIsMobile();
  const router = useRouter();
  const { user } = useAuth();
  const autoOpenedCreateRef = useRef(false);
  const [leaveConfirmOpened, setLeaveConfirmOpened] = useState(false);
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false);
  const {
    groups,
    isGroupsLoading,
    groupDetails,
    isDetailsLoading,
    createModalOpened,
    openCreateModal,
    closeCreateModal,
    drawerOpened,
    openDrawer,
    closeDrawer,
    manageMembersOpened,
    openManageMembers,
    closeManageMembers,
    editGroupOpened,
    openEditGroup,
    closeEditGroup,
    updateGroupMutation,
    leaveMutation,
    deleteGroupMutation,
    addMemberMutation,
    inviteUsersMutation,
    removeMemberMutation,
    handleGroupCreated,
  } = useGroupLayout({
    activeGroupId,
    joinGroupAction,
    leaveGroupAction,
    deleteGroupAction,
    addMemberByEmailAction,
    inviteUsersToGroupAction,
    removeMemberAction,
    updateGroupAction,
  });

  const currentMember = groupDetails?.members.find(
    (m) => m.user_id === user?.id,
  );
  const isAdmin = currentMember?.role === "Admin";

  useEffect(() => {
    if (autoOpenCreateGroup && !autoOpenedCreateRef.current) {
      autoOpenedCreateRef.current = true;
      openCreateModal();
    }
  }, [autoOpenCreateGroup, openCreateModal]);

  const handleNewGroupClick = () => {
    closeDrawer();
    openCreateModal();
  };

  const handleLeaveConfirm = () => {
    if (!activeGroupId) return;
    leaveMutation.mutate(activeGroupId);
    setLeaveConfirmOpened(false);
  };

  const handleDeleteConfirm = () => {
    if (!activeGroupId) return;
    deleteGroupMutation.mutate(activeGroupId);
    setDeleteConfirmOpened(false);
  };

  const memberProfiles: User[] = (groupDetails?.members ?? []).map((m) => ({
    user_id: m.user_id,
    first_name: m.first_name ?? "",
    last_name: m.last_name ?? "",
    email: "",
    research_interests: [m.role],
    avatar_url: m.avatar_url ?? null,
  }));

  const sidebarNode = (
    <LSGroupSidebar
      groups={groups}
      activeGroupId={activeGroupId}
      onNewGroupClick={handleNewGroupClick}
      isLoading={isGroupsLoading}
    />
  );

  const groupInitials =
    groupDetails?.name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("") ?? "";

  const contentNode =
    activeGroupId && groupDetails ? (
      <Stack gap="md">
        <Flex p={8} direction={{ base: "column", lg: "row" }} w="100%" gap="md">
          <Box flex={5}>
            <Paper
              p="xl"
              radius="md"
              withBorder
              bg="var(--ls-surface)"
              shadow='xs'
            >
              <Group gap="md" align="flex-start">
                <Avatar
                  size={76}
                  radius="xl"
                  color="blue"
                  bg={groupDetails.avatar_url ? undefined : "var(--ls-brand)"}
                  src={groupDetails.avatar_url ?? undefined}
                >
                  {groupInitials}
                </Avatar>
                <Stack gap={4} style={{ flex: 1 }}>
                  <Text size="xl" fw={700} c="var(--ls-text-strong)">
                    {groupDetails.name}
                  </Text>
                  <Group gap={8} wrap="wrap">
                    <Text size="sm" fw={600} c="var(--ls-tint-text)">
                      {groupDetails.memberCount} members
                    </Text>
                    {groupDetails.topics?.slice(0, 4).map((topic) => (
                      <Text
                        key={topic}
                        size="xs"
                        fw={700}
                        c="var(--ls-tint-text)"
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: "var(--ls-tint-bg-2)",
                          border: "1px solid var(--ls-tint-border)",
                        }}
                      >
                        {topic}
                      </Text>
                    ))}
                  </Group>
                  {groupDetails.description && (
                    <Text c="var(--ls-text-body)" lh={1.7}>
                      {groupDetails.description}
                    </Text>
                  )}
                </Stack>
              </Group>
            </Paper>
          </Box>
          <Box flex={3}>
            <Stack gap="xs">
              <LSMiniProfileList
                widgetTitle={`Members - ${groupDetails.memberCount}`}
                profiles={memberProfiles}
              />
              <Group>
                {groupDetails.conversation_id && (
                  <Button
                    flex='1'
                    variant="outline"
                    leftSection={<IconMessageCircle size={16} />}
                    onClick={() =>
                      router.push(`/chat/${groupDetails.conversation_id}`)
                    }
                  >
                    Group Chat
                  </Button>
                )}
                {currentMember && (
                  isAdmin ? (
                    <Menu shadow="md" width={260} position="bottom-end">
                      <Menu.Target>
                        <Button
                          flex='1'
                          variant="outline"
                          leftSection={<IconSettings size={16} />}
                          aria-label="Group settings"
                        >
                          Settings
                        </Button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconEdit size={16} />}
                          onClick={openEditGroup}
                        >
                          Edit group
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconUsers size={16} />}
                          onClick={openManageMembers}
                        >
                          Manage members
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={16} />}
                          onClick={() => setDeleteConfirmOpened(true)}
                          disabled={deleteGroupMutation.isPending}
                        >
                          Delete group
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  ) : (
                    <Button
                      flex='1'
                      variant="light"
                      color="red"
                      fullWidth
                      radius="xl"
                      leftSection={<IconLogout size={16} />}
                      onClick={() => setLeaveConfirmOpened(true)}
                      loading={leaveMutation.isPending}
                    >
                      Leave
                    </Button>
                  )
                )}
              </Group>
            </Stack>
          </Box>
        </Flex>

        <Box px={8}>
          <LSGroupFeed
            groupId={activeGroupId}
            currentUserId={user?.id ?? null}
            createPostAction={createPostAction}
            createPostImageUploadUrlAction={createPostImageUploadUrlAction}
            createCommentAction={createCommentAction}
            createReportAction={createReportAction}
            likePostAction={likePostAction}
            likeCommentAction={likeCommentAction}
            updatePostAction={updatePostAction}
          />
        </Box>
      </Stack>
    ) : activeGroupId && isDetailsLoading ? (
      <Center h="100%">
        <LSSpinner />
      </Center>
    ) : activeGroupId && !isDetailsLoading && !groupDetails ? (
      <Center h="100%">
        <Paper
          radius="xl"
          p="xl"
          withBorder
          bg="var(--ls-surface)"
          style={{ borderColor: "var(--ls-border)" }}
        >
          <Stack align="center" gap="sm">
            <Text c="var(--ls-text-muted)" size="lg">
            Group not found.
            </Text>
            <Button
              variant="light"
              radius="xl"
              onClick={() => router.push("/groups")}
            >
              Back to Groups
            </Button>
          </Stack>
        </Paper>
      </Center>
    ) : (
      <Center h="50%">
        <Paper
          p="xl"
          radius="md"
          withBorder
          bg="var(--ls-empty-bg)"
          style={{ borderColor: "var(--ls-border)" }}
          maw='420'
        >
          <Stack align="center" gap="sm">
            <ThemeIcon
              size={64}
              radius="xl"
              variant="outline"
              color='navy.7'
              style={{ color: "var(--ls-text-strong)", borderColor: "var(--ls-text-strong)" }}
            >
              <IconUsersGroup size={30} />
            </ThemeIcon>
            <Text c="var(--ls-text-strong)" size="xl" fw={700}>
              Select a group
            </Text>
            <Text c="gray.7" size="sm" ta="center">
              Open one of your active groups from the sidebar to jump into its
              posts, members, and chat.
            </Text>
          </Stack>
        </Paper>
      </Center>
    );

  return (
    <>
      <LSCreateGroupModal
        opened={createModalOpened}
        onClose={closeCreateModal}
        createGroupAction={createGroupAction}
        onCreated={handleGroupCreated}
      />

      {/* Leave group confirmation */}
      <Modal
        opened={leaveConfirmOpened}
        onClose={() => setLeaveConfirmOpened(false)}
        title="Leave Group"
        size="sm"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to leave{" "}
            <Text span fw={600}>
              {groupDetails?.name}
            </Text>
            ? You will lose access to the group feed and chat.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button
              variant="default"
              onClick={() => setLeaveConfirmOpened(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleLeaveConfirm}
              loading={leaveMutation.isPending}
            >
              Leave Group
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete group confirmation */}
      <Modal
        opened={deleteConfirmOpened}
        onClose={() => setDeleteConfirmOpened(false)}
        title="Delete Group"
        size="sm"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to permanently delete{" "}
            <Text span fw={600}>
              {groupDetails?.name}
            </Text>
            ? All posts, comments, messages, and members will be removed. This
            action cannot be undone.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button
              variant="default"
              onClick={() => setDeleteConfirmOpened(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleDeleteConfirm}
              loading={deleteGroupMutation.isPending}
            >
              Delete Group
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Admin member management */}
      {activeGroupId && groupDetails && (
        <LSManageMembersModal
          opened={manageMembersOpened}
          onClose={closeManageMembers}
          groupId={activeGroupId}
          members={groupDetails.members}
          addMemberMutation={addMemberMutation}
          inviteUsersMutation={inviteUsersMutation}
          removeMemberMutation={removeMemberMutation}
        />
      )}

      {activeGroupId && groupDetails && (
        <LSEditGroupModal
          opened={editGroupOpened}
          onClose={closeEditGroup}
          group={groupDetails}
          updateGroupMutation={updateGroupMutation}
          createGroupAvatarUploadUrlAction={createGroupAvatarUploadUrlAction}
        />
      )}

      {isMobile ? (
        <>
          <Drawer
            opened={drawerOpened}
            onClose={closeDrawer}
            padding={0}
            size="xs"
            title=""
            withCloseButton={false}
          >
            {sidebarNode}
          </Drawer>

          <Stack
            gap={0}
            h="calc(100vh - 60px)"
          >
            <Box p="xs">
              <Button
                variant="subtle"
                size="compact-sm"
                leftSection={<IconMenu2 size={18} />}
                onClick={openDrawer}
                c="var(--ls-text-strong)"
              >
                Groups
              </Button>
            </Box>

            <Box flex={1} py="md" px="md" style={{ overflow: "auto" }}>
              {contentNode}
            </Box>
          </Stack>
        </>
      ) : (
        <Flex
          h="calc(100vh - 60px)"
        >
          <Paper
            w={320}
            miw={320}
            radius={0}
            style={{
              borderRight: '1px solid var(--mantine-color-gray-3)'
            }}
            bg="var(--ls-groups-rail-bg)"
          >
            {sidebarNode}
          </Paper>

          <Box
            flex={1}
            py={24}
            px={{ base: "md", md: "xl", lg: 80 }}
            style={{ overflow: "auto" }}
            bg="var(--ls-groups-content-bg)"
          >
            {contentNode}
          </Box>
        </Flex>
      )}
    </>
  );
}
