"use client";

import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Flex,
  Group,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconBookmark,
  IconBriefcase,
  IconBuilding,
  IconCalendar,
  IconExternalLink,
  IconFlag,
  IconMail,
  IconMapPin,
  IconPencil,
  IconShare3,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/use-auth";
import { PostRichTextContent } from "@/components/feed/post-rich-text-content";
import { copyJobLink } from "./job-share";
import type { JobViewModel } from "./job-view-model";
import { useDeleteJob, useSetSavedJob } from "./use-jobs";

interface JobDetailsPageProps {
  job: JobViewModel;
  similarJobs: JobViewModel[];
  poster: JobPosterViewModel | null;
}

interface JobPosterViewModel {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  occupation: string | null;
  workplace: string | null;
  about: string | null;
  location: string | null;
  labDepartment: string | null;
}

export function JobDetailsPage({
  job,
  similarJobs,
  poster,
}: JobDetailsPageProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(job.isSaved);
  const setSavedJob = useSetSavedJob(user?.id ?? "");
  const deleteJobMutation = useDeleteJob();
  const isOwner = user?.id === job.posterId;

  const handleSaveClick = () => {
    const nextSaved = !saved;
    setSaved(nextSaved);
    setSavedJob.mutate(
      { jobId: job.id, isSaved: nextSaved },
      {
        onError: () => setSaved(!nextSaved),
      },
    );
  };

  const handleDeleteClick = () => {
    if (!window.confirm("Delete this job? This cannot be undone.")) {
      return;
    }

    deleteJobMutation.mutate(job.id, {
      onSuccess: () => router.push("/jobs"),
    });
  };

  return (
    <Box mih="calc(100vh - 56px)">
      <Box maw={1200} mx="auto" px={{ base: "sm", md: "xl" }} py="xl">
        <Button
          component={Link}
          href="/jobs"
          variant="subtle"
          color="gray"
          mb="lg"
        >
          Back to Jobs
        </Button>

        <Flex gap="lg" align="flex-start">
          <Stack flex={1} miw={0} gap="md">
            <Card radius="md" shadow="xs" padding="xl" withBorder>
              <Group
                align="flex-start"
                justify="space-between"
                wrap="nowrap"
                mb="md"
              >
                <Box flex={1} miw={0}>
                  <Text component="h1" fz={26} fw={850} c="gray.9" m={0}>
                    {job.title}
                  </Text>
                  <Group gap={6} c="gray.7" mb={4} mt="xs">
                    <IconBuilding
                      size={16}
                      color="var(--mantine-color-gray-5)"
                    />
                    <Text span fw={700}>
                      {job.org}
                    </Text>
                    <Text span c="gray.4">
                      -
                    </Text>
                    <IconMapPin size={15} color="var(--mantine-color-gray-5)" />
                    <Text span>{job.location}</Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {job.dept}
                  </Text>
                </Box>
                <ThemeIcon size={58} radius="md" color="navy">
                  <Text fw={800}>{job.org.slice(0, 3).toUpperCase()}</Text>
                </ThemeIcon>
              </Group>

              <Group gap="sm" c="gray.6" fz="sm" mb="md">
                <Fact icon={<IconBriefcase size={15} />} value={job.type} />
                <Fact
                  icon={<IconCalendar size={15} />}
                  value={`Posted ${job.posted}`}
                />
                <Text
                  span
                  fw={700}
                  c={job.remote === "Remote" ? "green.7" : "gray.7"}
                >
                  {job.remote}
                </Text>
              </Group>

              <Group gap={6} mb="lg">
                <Badge variant="light" color="gray" radius="xl">
                  {job.remote}
                </Badge>
                <Badge variant="light" color="gray" radius="xl">
                  {job.type}
                </Badge>
              </Group>

              <Divider mb="md" />

              <Group gap="xs">
                {job.applyUrl ? (
                  <Button
                    component={Link}
                    href={job.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                    color="navy"
                    leftSection={<IconExternalLink size={16} />}
                  >
                    Apply Now
                  </Button>
                ) : (
                  <Button
                    color="navy"
                    leftSection={<IconExternalLink size={16} />}
                    disabled
                  >
                    Apply Now
                  </Button>
                )}
                <Button
                  variant={saved ? "light" : "outline"}
                  color={saved ? "navy" : "gray"}
                  leftSection={
                    <IconBookmark
                      size={16}
                      fill={saved ? "currentColor" : "none"}
                    />
                  }
                  disabled={!user}
                  loading={setSavedJob.isPending}
                  onClick={handleSaveClick}
                >
                  {saved ? "Saved" : "Save Job"}
                </Button>
                <Button
                  variant="outline"
                  color="gray"
                  leftSection={<IconShare3 size={16} />}
                  onClick={() => void copyJobLink(job.id)}
                >
                  Share
                </Button>
                <Button
                  ml="auto"
                  variant="subtle"
                  color="red"
                  leftSection={<IconFlag size={15} />}
                  disabled
                >
                  Report
                </Button>
              </Group>
            </Card>

            <Card radius="md" shadow="xs" padding="xl" withBorder>
              {job.summary?.trim() ? (
                <JobSection title="Short Summary">
                  <Text size="sm" c="gray.7" lh={1.7}>
                    {job.summary.trim()}
                  </Text>
                </JobSection>
              ) : null}

              <JobSection title="Full Description">
                <PostRichTextContent html={job.description} />
              </JobSection>

              <ResearchFitSection job={job} />

              <JobSection title="How to Apply">
                <Text size="sm" c="gray.7" lh={1.7} mb="md">
                  {job.applyUrl
                    ? "Use the external application link below to continue."
                    : "No application link has been published for this listing yet."}
                </Text>
                <Group gap="xs">
                  {job.applyUrl ? (
                    <Button
                      component={Link}
                      href={job.applyUrl}
                      target="_blank"
                      rel="noreferrer"
                      color="navy"
                      leftSection={<IconExternalLink size={16} />}
                    >
                      Apply via External Portal
                    </Button>
                  ) : (
                    <Button
                      color="navy"
                      leftSection={<IconExternalLink size={16} />}
                      disabled
                    >
                      Apply via External Portal
                    </Button>
                  )}
                  {job.contactEmail ? (
                    <Button
                      component={Link}
                      href={`mailto:${job.contactEmail}`}
                      variant="outline"
                      color="gray"
                      leftSection={<IconMail size={16} />}
                    >
                      Contact
                    </Button>
                  ) : null}
                </Group>
              </JobSection>
            </Card>
          </Stack>

          <Stack w={310} gap="md" visibleFrom="lg" pos="sticky" top={80}>
            <Card radius="md" shadow="xs" padding="md" withBorder>
              <Text size="sm" fw={800} mb="sm">
                Quick Facts
              </Text>
              <QuickFact
                icon={<IconBuilding size={16} />}
                label="Organization"
                value={job.org}
              />
              <QuickFact
                icon={<IconBriefcase size={16} />}
                label="Employment Type"
                value={job.type}
              />
              <QuickFact
                icon={<IconMapPin size={16} />}
                label="Location"
                value={`${job.location} (${job.remote})`}
              />
              <QuickFact
                icon={<IconCalendar size={16} />}
                label="Posted"
                value={job.posted}
              />
            </Card>

            <PosterCard poster={poster} />

            <Card
              radius="md"
              shadow="xs"
              padding="md"
              withBorder
              bg={
                isOwner
                  ? "var(--mantine-color-yellow-light)"
                  : "var(--mantine-color-blue-light)"
              }
              style={
                isOwner
                  ? {
                      borderColor:
                        "color-mix(in srgb, var(--mantine-color-yellow-light-color) 40%, transparent)",
                    }
                  : undefined
              }
            >
              <Text size="sm" c="dimmed" mb="sm">
                {isOwner ? "This is your job" : "Ready to apply?"}
              </Text>
              {job.applyUrl ? (
                <Button
                  component={Link}
                  href={job.applyUrl}
                  target="_blank"
                  rel="noreferrer"
                  fullWidth
                  color="navy"
                  mb="xs"
                >
                  Apply Now
                </Button>
              ) : (
                <Button fullWidth color="navy" mb="xs" disabled>
                  Apply Now
                </Button>
              )}
              {job.contactEmail ? (
                <Button
                  component={Link}
                  href={`mailto:${job.contactEmail}`}
                  fullWidth
                  variant="outline"
                  color="gray"
                  mb="xs"
                  leftSection={<IconMail size={16} />}
                >
                  Contact
                </Button>
              ) : null}
              <Button
                fullWidth
                variant={saved ? "light" : "outline"}
                color={saved ? "navy" : "gray"}
                disabled={!user}
                loading={setSavedJob.isPending}
                onClick={handleSaveClick}
              >
                {saved ? "Saved" : "Save Job"}
              </Button>
              {isOwner ? (
                <Button
                  component={Link}
                  href={`/jobs/${job.id}/edit`}
                  fullWidth
                  variant="outline"
                  color="gray"
                  mt="xs"
                  leftSection={<IconPencil size={16} />}
                >
                  Edit Job
                </Button>
              ) : null}
              {isOwner ? (
                <Button
                  fullWidth
                  variant="outline"
                  color="red"
                  mt="xs"
                  leftSection={<IconTrash size={16} />}
                  loading={deleteJobMutation.isPending}
                  onClick={handleDeleteClick}
                >
                  Delete Job
                </Button>
              ) : null}
            </Card>
          </Stack>
        </Flex>
      </Box>
    </Box>
  );
}

function ResearchFitSection({ job }: { job: JobViewModel }) {
  const groups = [
    {
      title: "Required Research Areas",
      items: job.requiredResearchAreas,
      color: "navy",
    },
    {
      title: "Recommended Research Areas",
      items: job.recommendedResearchAreas,
      color: "blue",
    },
    {
      title: "Required Skills",
      items: job.requiredSkills,
      color: "navy",
    },
    {
      title: "Recommended Skills",
      items: job.recommendedSkills,
      color: "blue",
    },
  ];
  const visibleGroups = groups.filter((group) => group.items.length > 0);

  if (visibleGroups.length === 0) {
    return null;
  }

  return (
    <JobSection title="Research Fit">
      <Stack gap="md">
        {visibleGroups.map((group) => (
          <Stack key={group.title} gap={6}>
            <Text size="sm" fw={800} c="gray.8">
              {group.title}
            </Text>
            <Group gap={6}>
              {group.items.map((item) => (
                <Badge
                  key={`${group.title}-${item}`}
                  variant="light"
                  color={group.color}
                  radius="xl"
                >
                  {item}
                </Badge>
              ))}
            </Group>
          </Stack>
        ))}
      </Stack>
    </JobSection>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function PosterCard({ poster }: { poster: JobPosterViewModel | null }) {
  if (!poster) {
    return (
      <Card radius="md" shadow="xs" padding="md" withBorder>
        <Text size="sm" fw={800} mb="sm">
          Posted by
        </Text>
        <Text size="sm" c="dimmed">
          Poster details are unavailable.
        </Text>
      </Card>
    );
  }

  const roleLine = [poster.occupation, poster.workplace]
    .filter(Boolean)
    .join(" - ");

  return (
    <Card radius="md" shadow="xs" padding="md" withBorder>
      <Text size="sm" fw={800} mb="sm">
        Posted by
      </Text>

      <Group align="flex-start" wrap="nowrap" mb="sm">
        <Avatar
          size={52}
          radius="xl"
          color="navy.7"
          bg={poster.avatarUrl ? undefined : "navy.7"}
          src={poster.avatarUrl ?? undefined}
        >
          {getInitials(poster.name)}
        </Avatar>
        <Box miw={0}>
          <Text fw={800} c="gray.9" lineClamp={1}>
            {poster.name}
          </Text>
          {roleLine ? (
            <Text size="sm" c="dimmed" lineClamp={2}>
              {roleLine}
            </Text>
          ) : null}
        </Box>
      </Group>

      {poster.about ? (
        <Text size="sm" c="gray.7" lineClamp={3} mb="sm">
          {poster.about}
        </Text>
      ) : null}

      <Stack gap={8} mb="md">
        <PosterFact icon={<IconMail size={15} />} value={poster.email} />
        {poster.location ? (
          <PosterFact icon={<IconMapPin size={15} />} value={poster.location} />
        ) : null}
        {poster.labDepartment ? (
          <PosterFact
            icon={<IconBuilding size={15} />}
            value={poster.labDepartment}
          />
        ) : null}
      </Stack>

      <Button
        component={Link}
        href={`/profile/${poster.userId}`}
        fullWidth
        variant="outline"
        color="gray"
        leftSection={<IconUser size={16} />}
      >
        View Profile
      </Button>
    </Card>
  );
}

function PosterFact({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <Group gap={8} wrap="nowrap" align="flex-start">
      <Box c="gray.5" mt={2}>
        {icon}
      </Box>
      <Text size="sm" c="gray.7" lineClamp={2}>
        {value}
      </Text>
    </Group>
  );
}

function Fact({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <Group gap={4}>
      {icon}
      <Text span>{value}</Text>
    </Group>
  );
}

function JobSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box mb="xl">
      <Text
        size="md"
        fw={800}
        mb="sm"
        pb="xs"
        style={{ borderBottom: "1px solid var(--mantine-color-gray-1)" }}
      >
        {title}
      </Text>
      {children}
    </Box>
  );
}

function QuickFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Group
      gap="sm"
      align="flex-start"
      py="sm"
      wrap="nowrap"
      style={{ borderBottom: "1px solid var(--mantine-color-gray-1)" }}
    >
      <Box c="gray.5" mt={2}>
        {icon}
      </Box>
      <Box>
        <Text size="xs" c="dimmed" fw={700} tt="uppercase">
          {label}
        </Text>
        <Text size="sm" fw={650}>
          {value}
        </Text>
      </Box>
    </Group>
  );
}
