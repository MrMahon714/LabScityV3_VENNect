import {
  Group,
  Badge,
  Button,
  Text,
  Image,
  Avatar,
  Card,
  Box,
  Stack,
  FileButton,
  Loader,
  UnstyledButton,
} from "@mantine/core";
import { IconBuildings, IconCamera, IconClock, IconFileText, IconMapPin, IconMessageCircle, IconPencil, IconPlus, IconSchool, IconUserPlus } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { LSEditProfileModal } from "./ls-edit-profile-modal";
import { useDisclosure } from "@mantine/hooks";
import type { User } from "@/lib/types/feed";
import LSProfileListModal from "./ls-profile-list-modal";
import { useUserFollowers, useUserFollowing } from "./use-profile";
import classes from './ls-profile-hero.module.css'
import { LSAddSkillsModal } from "./ls-add-skills-modal";
import { LSAddTagsModal } from "./ls-add-tags-modal";
import LSExtractResumeModal from "./ls-extract-resume-modal";

const PROFILE_BANNER_HEIGHT = 150;

/**
 * Props for LSProfileHero.
 *
 * @param profileName - Display name (used for avatar initials when profilePicURL missing).
 * @param profileResearchInterest - Subtitle (e.g. first research interest).
 * @param profileAbout - Optional "About" section text.
 * @param profileSkill - Optional list of skill badges.
 * @param profileArticles - Optional list of { title, url }; first 3 shown inline, rest in modal.
 * @param profileHeaderImageURL - Banner/header image URL.
 * @param profilePicURL - Avatar image URL.
 * @param occupation - Job title (replaces legacy profileRole).
 * @param workplace - Institution/employer (replaces legacy profileInstitution).
 * @param isOwnProfile - If true, show Edit and upload overlays; otherwise show Follow/Unfollow.
 * @param onProfilePicSelect - When set (own profile), file selection triggers profile pic upload.
 * @param isUploadingProfilePic - Shows loader on avatar overlay while uploading.
 * @param onProfileHeaderSelect - When set (own profile), file selection triggers banner upload.
 * @param isUploadingProfileHeader - Shows loader on banner overlay while uploading.
 * @param onOpenEditProfile - When own profile: called when user clicks Edit (parent opens modal).
 * @param editModalOpened - Edit modal controlled open state.
 * @param onEditModalClose - Edit modal close handler.
 * @param editInitialValues - Form initial values for the edit modal.
 * @param onEditSubmit - Edit form submit handler.
 * @param isEditSubmitting - Edit form submitting state.
 * @param isFollowing - When viewing others: current follow state.
 * @param onToggleFollow - When viewing others: follow/unfollow action.
 * @param isTogglePending - When viewing others: follow mutation pending state.
 * @param onMessageClick - When viewing others: starts or opens a direct message.
 * @param isMessagePending - When viewing others: direct-message creation pending state.
 * @param onReportClick - When viewing others: called when user clicks Report button.
 */
export interface LSProfileHeroProps {
  profile: User;
  isOwnProfile: boolean;
  onProfilePicSelect?: (file: File | null) => void;
  isUploadingProfilePic?: boolean;
  onProfileHeaderSelect?: (file: File | null) => void;
  isUploadingProfileHeader?: boolean;
  isFollowing?: boolean;
  onToggleFollow?: () => void;
  isTogglePending?: boolean;
  onMessageClick?: () => void;
  isMessagePending?: boolean;
  onReportClick?: () => void;
}

function formatLocalTime(timeZone: string, now: Date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short", // gives "EST"; "shortOffset" would give "GMT-5"
  }).format(now);
}

/**
 * Profile hero card: banner image, avatar, name, research interest, occupation/workplace,
 * about, skills, and articles. First 3 articles inline; "Show all X articles" opens a scrollable modal (60vh).
 * Own profile: Edit button and LSEditProfileModal; hover overlays on avatar/banner for upload (overlay z-index 130
 * above avatar so the camera/Edit overlay is visible). Other profile: Follow/Unfollow button.
 */
export default function LSProfileHero({
  profile,
  isOwnProfile,
  onProfilePicSelect,
  isUploadingProfilePic = false,
  onProfileHeaderSelect,
  isUploadingProfileHeader = false,
  isFollowing = false,
  onToggleFollow,
  isTogglePending = false,
  onMessageClick,
  isMessagePending = false,
  onReportClick,
}: LSProfileHeroProps) {
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);

  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [listModal, setListModal] = useState<"followers" | "following" | null>(null);

  const [skillsModalOpened, { open: openSkillsModal, close: closeSkillsModal }] = useDisclosure(false);
  const [researchAreasModalOpened, { open: openResearchAreasModal, close: closeResearchAreasModal }] = useDisclosure(false);
  const [resumeModalOpened, { open: openResumeModal, close: closeResumeModal }] = useDisclosure(false);
  
  const lastList = useRef<"followers" | "following">("followers");
  if (listModal) lastList.current = listModal;

  const activeList = listModal ?? lastList.current;
  const { data: followers = []} = useUserFollowers(profile.user_id);
  const { data: following = []} = useUserFollowing(profile.user_id);

  const profileName = `${profile.first_name} ${profile.last_name}`;
  const profileAbout = profile.about ?? undefined;
  const profileSkills = profile.skills;
  const profileTags = profile.declared_tags;
  const profileHeaderImageURL = profile.profile_header_url ?? undefined;
  const profilePicURL = profile.avatar_url ?? undefined;
  const occupation = profile.occupation ?? undefined;
  const workplace = profile.workplace ?? undefined;
  const labDepartment = profile.lab_department ?? undefined;
  const location = profile.location ?? undefined;
  const timezone = profile.timezone ?? undefined;

  const avatarInitials = profileName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  const avatar = (
    <Avatar
      src={profilePicURL || undefined}
      size={80}
      color="navy.6"
      bg={profilePicURL ? undefined : "navy.1"}
      bd="2px solid white"
      style={{ position: "relative", zIndex: 2 }}
    >
      {avatarInitials}
    </Avatar>
  );

  const profileBanner = profileHeaderImageURL ? (
    <Image
      bg="gray"
      w="100%"
      h={PROFILE_BANNER_HEIGHT}
      src={profileHeaderImageURL}
    />
  ) : ( 
    <Box
      w="100%"
      h={PROFILE_BANNER_HEIGHT}
      bg='navy.7'
    />
  );

  return (
    <Card shadow="xs" radius="md" bd='1px solid gray.3' padding='none'>

      {/* Profile Banner */}
      {isOwnProfile && onProfileHeaderSelect ? (
        <FileButton onChange={onProfileHeaderSelect} accept="image/jpeg,image/png,image/webp,image/gif">
          {(props) => (
            <button
              type="button"
              {...props}
              onMouseEnter={() => setIsHeaderHovered(true)}
              onMouseLeave={() => setIsHeaderHovered(false)}
              style={{
                border: "none",
                padding: 0,
                background: "transparent",
                width: "100%",
                display: "block",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                lineHeight: 0,
              }}
            >
              {profileBanner}
              {(isHeaderHovered || isUploadingProfileHeader) ? (
                <Box
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.35)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                    gap: 4,
                  }}
                >
                  {isUploadingProfileHeader ? (
                    <Loader size="xs" color="white" />
                  ) : (
                    <>
                      <IconCamera size={20} />
                      Change banner
                    </>
                  )}
                </Box>
              ) : null}
            </button>
          )}
        </FileButton>
      ) : (
        profileBanner
      )}

      <Stack pos="relative" px='lg' pb='lg' pt='md' gap='12'>
        <Group justify='space-between' align='flex-start' wrap='nowrap'>
          <Box mt={-56} pos='relative' style={{ zIndex: 2 }}>
            {/* Avatar shows profile image or initials when missing; z-index keeps it atop header */}
            {isOwnProfile && onProfilePicSelect ? (
              <FileButton onChange={onProfilePicSelect} accept="image/jpeg,image/png,image/webp,image/gif">
                {(props) => (
                  <button
                    type="button"
                    {...props}
                    onMouseEnter={() => setIsAvatarHovered(true)}
                    onMouseLeave={() => setIsAvatarHovered(false)}
                    style={{
                      border: "none",
                      padding: 0,
                      background: "transparent",
                      cursor: "pointer",
                      position: "relative",
                      zIndex: 2,
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      overflow: "hidden",
                    }}
                  >
                    {avatar}
                    {/* Overlay z-index 130 so it sits above the avatar/button and remains visible. */}
                    {(isAvatarHovered || isUploadingProfilePic) ? (
                      <Box
                        style={{
                          position: "absolute",
                          inset: 0,
                          zIndex: 3,
                          borderRadius: "50%",
                          background: "rgba(0,0,0,0.45)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: 10,
                          fontWeight: 600,
                          gap: 2,
                        }}
                      >
                        {isUploadingProfilePic ? (
                          <Loader size="xs" color="white" />
                        ) : (
                          <>
                            <IconCamera size={18} />
                            Edit
                          </>
                        )}
                      </Box>
                    ) : null}
                  </button>
                )}
              </FileButton>
            ) : (
              avatar
            )}
          </Box>
          {isOwnProfile ? (
            <>
            <Stack gap="xs" align="stretch">
              <Button
                variant="outline"
                onClick={openEditModal}
                leftSection={<IconPencil size='1rem'/>}
              >
                Edit Profile
                </Button>
                <Button
                  variant="outline"
                  onClick={openResumeModal}
                  leftSection={<IconFileText size='1rem'/>}
                >
                  Extract Resume
                </Button>
              </Stack>
              <LSEditProfileModal
                opened={editModalOpened}
                onClose={closeEditModal}
                userId={profile.user_id}
              />
              <LSExtractResumeModal
                opened={resumeModalOpened}
                onClose={closeResumeModal}
              />
            </>
            ) : (
              // Follow, Report, and Message Buttons
              <Group gap="sm">
                {onToggleFollow && (
                  <Button
                    variant={isFollowing ? "outline" : "filled"}
                    leftSection={<IconUserPlus size='1rem'/>}
                    onClick={onToggleFollow}
                    loading={isTogglePending}
                  >
                    {isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                )}
                {onMessageClick && (
                  <Button
                    variant='outline'
                    leftSection={<IconMessageCircle size='1rem'/>}
                    onClick={onMessageClick}
                    loading={isMessagePending}
                  >
                    Message
                  </Button>
                )}
                {onReportClick && (
                  <Button
                    variant="outline"
                    color="red"
                    onClick={onReportClick}
                  >
                    Report
                  </Button>
                )}
              </Group>
            )}
        </Group>

        {/* Profile Name + Workplace/Occupation */}
        <Stack gap="4" mt={-15}>
          <Text c="navy.7" fz={30} fw={700} lh='1'>{profileName}</Text>
          {(occupation ?? workplace) ? (
            <Text c="navy.6" size="sm">
              {[occupation, workplace].filter(Boolean).join(", ")}
            </Text>
          ) : null}
        </Stack>
        
        <Group gap="xs">
          <UnstyledButton onClick={() => setListModal("followers")} className={classes.followCounts}>
            <Text c="navy.7" size="sm">
              <b>{followers.length}</b> Followers
            </Text>
          </UnstyledButton>
          <UnstyledButton onClick={() => setListModal("following")} className={classes.followCounts}>
            <Text c="navy.7" size="sm">
              <b>{following.length}</b> Following
            </Text>
          </UnstyledButton>
          <LSProfileListModal
            title={activeList === "followers" ? "Followers" : "Following"}
            profiles={activeList === "followers" ? followers : following}
            opened={listModal !== null}
            onClose={() => setListModal(null)}
          />
        </Group>

        <Stack>
          <Stack fz='sm' gap='6'>
            {/* TODO: Update the profile table and updates so that the user can input these fields */}
            {/* Institution */}
            {
              workplace &&
              <Group gap='4'>
                <IconBuildings size='1.25rem' stroke={1.5} color="var(--mantine-color-dimmed)"/>
                <Text fz='sm' c='dimmed'>{workplace}</Text>
              </Group>
            }
            {/* Department/Lab */}
            {
              labDepartment && 
              <Group gap='4'>
                <IconSchool size='1.25rem' stroke={1.5} color="var(--mantine-color-dimmed)"/>
                <Text fz='sm' c='dimmed'>{labDepartment}</Text>
              </Group>
            }
            {/* Location + Time Zone */}
            {
              (location || timezone) && 
              <Group gap='xs'>
                {
                  location &&
                  <Group gap='4'>
                    <IconMapPin size='1rem' stroke={1.5} color="var(--mantine-color-dimmed)"/>
                    <Text fz='xs' c='dimmed'>{location}</Text>
                  </Group> 
                }
                {
                  timezone && 
                  <Group gap='4'>
                    <IconClock size='1rem' stroke={1.5} color="var(--mantine-color-dimmed)"/>
                    <Text fz='xs' c='dimmed'>Local Time {formatLocalTime(timezone)}</Text>
                  </Group> 
                }
              </Group>
            }
          </Stack>
        </Stack>

        {profileAbout &&
          <Text c="navy.7" fw='400' fz='sm' maw='800' my='6'>{profileAbout}</Text>
        }

        {
          (profileTags && profileTags.length > 0) 
          ?
          <Stack gap='xs'>
            <Text fz='xs' c='dimmed' fw='bold'>RESEARCH AREAS</Text>
            <Group gap='xs'>
            {
              profileTags.map((tag, i) => 
                <Badge 
                  key={tag.id || `${tag.name}${i}`}
                  bg='blue.0' 
                  bd='1px solid blue.3'
                  c='indigo.9'
                  size='md'
                  fw='600'
                  p='sm'
                  tt='none'
                >
                  {tag.name}
                </Badge>
              )
            }
            </Group>
            {
              isOwnProfile && 
              <>
                <Button 
                  variant='outline' 
                  rightSection={<IconPencil size='1rem'/>}
                  onClick={openResearchAreasModal}
                  c='dimmed'
                  bd='1px dashed dimmed'
                  bdrs='100'
                  size='xs'
                  w='fit-content'
                >
                  Edit Research Areas
                </Button>
                <LSAddTagsModal userId={profile.user_id} opened={researchAreasModalOpened} onClose={closeResearchAreasModal}/>
              </>
            }
          </Stack>
          :
          isOwnProfile &&
          <Stack gap='xs'>
            <Text fz='xs' c='dimmed' fw='bold'>RESEARCH AREAS</Text>
            <Stack gap='4'>
              <Text size='xs' c='dimmed'>Add your research areas to your profile to get collaboration recommendations</Text>
              <Button 
                variant='outline' 
                rightSection={<IconPlus size='1rem'/>}
                onClick={openResearchAreasModal}
                c='dimmed'
                bd='1px dashed dimmed'
                bdrs='100'
                size='xs'
                w='fit-content'
              >
                Add Research Areas
              </Button>
              <LSAddTagsModal userId={profile.user_id} opened={researchAreasModalOpened} onClose={closeResearchAreasModal}/>
            </Stack>
          </Stack>
        }

        {
          (profileSkills && profileSkills.length > 0) 
          ?
          <Stack gap='xs'>
            <Text c="dimmed" fw='bold' fz='xs'>SKILLS</Text>
            <Group gap={8}>
              { 
                profileSkills.map((skill, i) => 
                  <Badge 
                    key={skill.id ?? `${skill.name}${i}`} 
                    bg='gray.2' 
                    bd='1px solid gray.4' 
                    c='navy.7' 
                    tt='none'
                    size='md'
                    fw='600'
                    p='sm'
                    bdrs='md'
                  >
                    {skill.name}
                  </Badge>
                )
              }
            </Group>
            {
              isOwnProfile && 
              <>
              <Button 
                variant='outline' 
                rightSection={<IconPencil size='1rem'/>}
                onClick={openSkillsModal}
                c='dimmed'
                bd='1px dashed dimmed'
                bdrs='100'
                size='xs'
                w='fit-content'
              >
                Edit Skills
              </Button>
              <LSAddSkillsModal opened={skillsModalOpened} onClose={closeSkillsModal} userId={profile.user_id} />
              </>
            }
          </Stack>
          :
          isOwnProfile &&
          <Stack gap='xs'>
            <Text c="dimmed" fw='bold' fz='xs'>SKILLS</Text>
            <Stack gap='4'>
              <Text size='xs' c='dimmed'>Add skills to your profile to get collaboration recommendations</Text>
              <Button 
                variant='outline' 
                rightSection={<IconPlus size='1rem'/>}
                onClick={openSkillsModal}
                c='dimmed'
                bd='1px dashed dimmed'
                bdrs='100'
                size='xs'
                w='fit-content'
              >
                Add Skills
              </Button>
              <LSAddSkillsModal opened={skillsModalOpened} onClose={closeSkillsModal} userId={profile.user_id} />
            </Stack>
          </Stack>
        }
      </Stack>
    </Card >
  );
};

