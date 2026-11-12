"use client";

import {
  Box,
  Button,
  Center,
  Drawer,
  Flex,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { IconMenu2 } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/app/use-is-mobile";
import { useAuth } from "@/components/auth/use-auth";
import { LSSpinner } from "@/components/ui/ls-spinner";
import { LSCreateGroupModal } from "./ls-create-group-modal";
import { LSEditGroupModal } from "./ls-edit-group-modal";
import { LSGroupPage } from "./ls-group-page";
import { LSInviteUserModal } from "./ls-invite-user-modal";
import type { LSGroupLayoutProps } from "./ls-group-layout.types";
import { LSGroupSidebar } from "./ls-group-sidebar";
import { LSGroupsOverview } from "./ls-groups-overview";
import { LSManageMembersModal } from "./ls-manage-members-modal";
import { useGroupActivity } from "./use-group-activity";
import { useGroupLayout } from "./use-group-layout";

/*client stuff for the Groups page
Desktop: sidebar (left) + content (right)
Mobile: content only + hamburger thing for the sidebar
*/
export function LSGroupLayout(props: LSGroupLayoutProps) {
  const {
    activeGroupId,
    view = "mine",
    discoverNode,
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
  const [inviteOpened, setInviteOpened] = useState(false);
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

  const { activityByGroup, markSeen, isLoading: isActivityLoading } =
    useGroupActivity(groups);

  const currentMember = groupDetails?.members.find(
    (m) => m.user_id === user?.id,
  );
  const isAdmin = currentMember?.role === "Admin";

  useEffect(() => {
    if (view === "mine" && activeGroupId && groupDetails) {
      markSeen(activeGroupId);
    }
  }, [view, activeGroupId, groupDetails, markSeen]);

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

  const sidebarNode = (
    <LSGroupSidebar
      groups={groups}
      activeGroupId={activeGroupId}
      view={view}
      activityByGroup={activityByGroup}
      onNewGroupClick={handleNewGroupClick}
      onNavigate={closeDrawer}
      isLoading={isGroupsLoading}
    />
  );

  /*main column
  discover,
  then selected group,
  then the new-activity overview
   */
  const contentNode =
    view === "discover" ? (
      discoverNode
    ) : activeGroupId && groupDetails ? (
      <LSGroupPage
        key={groupDetails.group_id}
        group={groupDetails}
        isMember={Boolean(currentMember)}
        isAdmin={isAdmin}
        onOpenChat={() => router.push(`/chat/${groupDetails.conversation_id}`)}
        onInvite={() => setInviteOpened(true)}
        onEdit={openEditGroup}
        onManageMembers={openManageMembers}
        onDelete={() => setDeleteConfirmOpened(true)}
        onLeave={() => setLeaveConfirmOpened(true)}
        isLeaving={leaveMutation.isPending}
        isDeleting={deleteGroupMutation.isPending}
        feedProps={{
          groupId: activeGroupId,
          currentUserId: user?.id ?? null,
          createPostAction,
          createPostImageUploadUrlAction,
          createCommentAction,
          createReportAction,
          likePostAction,
          likeCommentAction,
          updatePostAction,
        }}
      />
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
      <LSGroupsOverview
        groups={groups}
        activityByGroup={activityByGroup}
        isLoading={isGroupsLoading || isActivityLoading}
        onCreateGroup={handleNewGroupClick}
        onOpenChat={(conversationId) => router.push(`/chat/${conversationId}`)}
      />
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
        <LSInviteUserModal
          opened={inviteOpened}
          onClose={() => setInviteOpened(false)}
          groupId={activeGroupId}
          groupName={groupDetails.name}
          members={groupDetails.members}
          inviteUsersMutation={inviteUsersMutation}
        />
      )}

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

          <Stack gap={0} h="calc(100vh - 60px)">
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
        <Flex h="calc(100vh - 60px)">
          <Paper
            w={340}
            miw={340}
            h="100%"
            radius={0}
            style={{
              borderRight: "1px solid var(--mantine-color-gray-3)",
              overflow: "auto",
            }}
            bg="var(--ls-groups-rail-bg)"
          >
            {sidebarNode}
          </Paper>

          <Box
            flex={1}
            py={24}
            px={{ base: "md", md: "xl" }}
            style={{ overflow: "auto" }}
            bg="var(--ls-groups-content-bg)"
          >
            <Box maw={1180} mx="auto">
              {contentNode}
            </Box>
          </Box>
        </Flex>
      )}
    </>
  );
}
