'use client';

import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  FileButton,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Stack,
  TagsInput,
  Text,
} from "@mantine/core";
import { IconAlertCircle, IconCheck, IconFileText, IconX } from "@tabler/icons-react";
import { useState, type Dispatch, type SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useExtractResume, useConfirmExtractedData } from "@/components/profile/use-profile";
import { useAuth } from "@/components/auth/use-auth";
import { useBulkInsertPublications } from "@/components/profile/publications/use-publications";
import { useSaveGrants } from "@/components/profile/use-grants";
import { createPublication } from "@/lib/actions/publication";
import { publicationKeys } from "@/lib/query-keys";
import { OPENALEX_WORK_TYPE_LABELS } from "@/lib/constants/openalex";
import {
  type ExtractedData,
  type ExtractedGrant,
  type ExtractedPublication,
  hasValidDoi,
  normalizeExtractedData,
  publicationProblem,
  toCreatePublicationValues,
  toParsedWorks,
  toPublicationType,
} from "@/components/profile/extract-resume-utils";

type SectionResult = { ok: boolean; text: string };

const grantProblem = (grant: ExtractedGrant) =>
  !grant.title?.trim() || !grant.grantingAgency?.trim() ? "Missing title or agency" : null;

const importableIndexes = <T,>(items: T[], problem: (item: T) => string | null) =>
  new Set(items.map((item, i) => (problem(item) ? -1 : i)).filter((i) => i >= 0));

//Review cards
function ProblemLine({ text }: { text: string }) {
  return (
    <Group gap="4" c="red.7" wrap="nowrap">
      <IconAlertCircle size={14} />
      <Text fz="xs">{text}, can't be imported</Text>
    </Group>
  );
}

function PublicationReviewCard({
  pub,
  checked,
  onChange,
}: {
  pub: ExtractedPublication;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const problem = publicationProblem(pub);
  const authors = pub.authors ?? [];
  const extraAuthors = authors.length - 3;
  const meta = [pub.journalOrVenue, pub.publicationDate].filter(Boolean).join(" · ");

  return (
    <Card withBorder radius="md" p="0.75rem" bg={checked && !problem ? "gray.0" : undefined}>
      <Group align="flex-start" wrap="nowrap" gap="0.75rem">
        <Checkbox
          checked={checked && !problem}
          disabled={!!problem}
          onChange={(e) => onChange(e.currentTarget.checked)}
          color="navy.7"
          aria-label={`Include "${pub.title}"`}
          mt="2"
        />
        <Stack gap="0.25rem" miw={0}>
          <Group gap="6">
            <Badge tt="none" bg="indigo.0" c="indigo.9" fw="500" size="sm">
              {OPENALEX_WORK_TYPE_LABELS[toPublicationType(pub.publicationType)]}
            </Badge>
            {!hasValidDoi(pub) && (
              <Badge tt="none" color="gray" variant="light" size="sm">
                No DOI
              </Badge>
            )}
          </Group>
          <Text fw="600" fz="sm" c="navy.7">
            {pub.title}
          </Text>
          {authors.length > 0 && (
            <Text fz="xs">
              {authors.slice(0, 3).join(" · ")}
              {extraAuthors > 0 && <Text span c="dimmed">{` +${extraAuthors} more`}</Text>}
            </Text>
          )}
          {meta && (
            <Text fz="xs" c="dimmed">
              {meta}
            </Text>
          )}
          {problem && <ProblemLine text={problem} />}
        </Stack>
      </Group>
    </Card>
  );
}

function GrantReviewCard({
  grant,
  checked,
  onChange,
}: {
  grant: ExtractedGrant;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const problem = grantProblem(grant);
  const agencyLine = [grant.grantingAgency, grant.program].filter(Boolean).join(" · ");

  return (
    <Card withBorder radius="md" p="0.75rem" bg={checked && !problem ? "gray.0" : undefined}>
      <Group align="flex-start" wrap="nowrap" gap="0.75rem">
        <Checkbox
          checked={checked && !problem}
          disabled={!!problem}
          onChange={(e) => onChange(e.currentTarget.checked)}
          color="navy.7"
          aria-label={`Include "${grant.title}"`}
          mt="2"
        />
        <Stack gap="0.25rem" miw={0}>
          {grant.role && (
            <Badge tt="none" bg="indigo.0" c="indigo.9" fw="500" size="sm" w="fit-content">
              {grant.role}
            </Badge>
          )}
          <Text fw="600" fz="sm" c="navy.7">
            {grant.title}
          </Text>
          {agencyLine && <Text fz="xs">{agencyLine}</Text>}
          {grant.yearsAwarded && (
            <Text fz="xs" c="dimmed">
              {grant.yearsAwarded}
            </Text>
          )}
          {(grant.collaborators?.length ?? 0) > 0 && (
            <Text fz="xs" c="dimmed">
              With {grant.collaborators!.join(", ")}
            </Text>
          )}
          {problem && <ProblemLine text={problem} />}
        </Stack>
      </Group>
    </Card>
  );
}

function SectionHeader({
  title,
  total,
  selected,
  onToggleAll,
}: {
  title: string;
  total: number;
  selected?: number;
  onToggleAll?: (checked: boolean) => void;
}) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text fw="600" fz="sm" c="navy.7">
        {title}
        {onToggleAll && (
          <Text span fz="xs" fw="400" c="dimmed">
            {"  "}
            {selected} of {total} selected
          </Text>
        )}
      </Text>
      {onToggleAll && total > 0 && (
        <Checkbox
          label="Select all"
          size="xs"
          color="navy.7"
          checked={selected === total}
          indeterminate={!!selected && selected < total}
          onChange={(e) => onToggleAll(e.currentTarget.checked)}
        />
      )}
    </Group>
  );
}

//Modal
export default function LSExtractResumeModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);
  const [selectedPubs, setSelectedPubs] = useState<Set<number>>(new Set());
  const [selectedGrants, setSelectedGrants] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<Record<string, SectionResult> | null>(null);

  const extractMutation = useExtractResume();
  const confirmMutation = useConfirmExtractedData(userId);
  const bulkInsertPubs = useBulkInsertPublications({ userId, onSuccess: () => {} });
  const saveGrants = useSaveGrants();

  const resetToUpload = () => {
    setFile(null);
    setExtractedData(null);
    setEditedData(null);
    setSelectedPubs(new Set());
    setSelectedGrants(new Set());
    setResults(null);
  };

  const handleClose = () => {
    if (saving) return;
    resetToUpload();
    onClose();
  };

  const handleUpload = (selected: File | null) => {
    setFile(selected);
  };

  const handleExtract = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await extractMutation.mutateAsync(formData);
      const data = normalizeExtractedData(result.extractedData);
      setExtractedData(data);
      setEditedData(data);
      setSelectedPubs(importableIndexes(data.publications, publicationProblem));
      setSelectedGrants(importableIndexes(data.grants, grantProblem));
    } catch (error) {
      console.error("Extraction error:", error);
    }
  };

  const toggle = (
    setter: Dispatch<SetStateAction<Set<number>>>,
    index: number,
    checked: boolean,
  ) =>
    setter((prev) => {
      const next = new Set(prev);
      if (checked) next.add(index);
      else next.delete(index);
      return next;
    });

  //Saves each section on its own, so one failing (e.g. grants table not
  const handleConfirm = async () => {
    if (!editedData) return;
    setSaving(true);
    const out: Record<string, SectionResult> = {};

    //Skills & research areas
    try {
      const res = await confirmMutation.mutateAsync({
        skills: editedData.skills,
        researchAreas: editedData.researchAreas,
      });
      out.profile = {
        ok: true,
        text: `${res.skills.added} skills and ${res.areas.added} research areas added`,
      };
    } catch (error) {
      console.error("Confirm error:", error);
      out.profile = {
        ok: false,
        text: error instanceof Error ? error.message : "Couldn't save skills and research areas",
      };
    }

    //Publications
    const chosenPubs = editedData.publications.filter((_, i) => selectedPubs.has(i));
    if (chosenPubs.length > 0) {
      let added = 0;
      let alreadyThere = 0;
      let failed = 0;

      const withDoi = toParsedWorks(chosenPubs.filter(hasValidDoi));
      if (withDoi.length > 0) {
        try {
          const res = await bulkInsertPubs.mutateAsync({ publications: withDoi });
          added += res?.inserted ?? 0;
          alreadyThere += res?.skipped ?? 0;
        } catch {
          failed += withDoi.length;
        }
      }

      for (const pub of chosenPubs.filter((p) => !hasValidDoi(p))) {
        const values = toCreatePublicationValues(pub);
        if (!values) continue;
        const res = await createPublication(values);
        if (res.success) added++;
        else failed++;
      }
      queryClient.invalidateQueries({ queryKey: publicationKeys.all });

      out.publications = {
        ok: failed === 0,
        text:
          `${added} publication${added === 1 ? "" : "s"} added` +
          (alreadyThere ? `, ${alreadyThere} already on your profile` : "") +
          (failed ? `, ${failed} failed` : ""),
      };
    }

    //Grants
    const chosenGrants = editedData.grants.filter((_, i) => selectedGrants.has(i));
    if (chosenGrants.length > 0) {
      try {
        const res = await saveGrants.mutateAsync(chosenGrants);
        out.grants = {
          ok: true,
          text:
            `${res.inserted} grant${res.inserted === 1 ? "" : "s"} added` +
            (res.skipped ? `, ${res.skipped} already on your profile` : ""),
        };
      } catch {
        out.grants = { ok: false, text: "Couldn't save grants. Please try again later." };
      }
    }

    setResults(out);
    setSaving(false);
  };

  //Upload
  if (!extractedData) {
    return (
      <Modal.Root opened={opened} onClose={handleClose} size="440px" centered>
        <Modal.Overlay />
        <Modal.Content bdrs="lg">
          <Modal.Header bg="navy.7" p="1rem 1.25rem">
            <Modal.Title c="white" fw="700" fz="lg">
              Extract CV
            </Modal.Title>
            <Modal.CloseButton c="white" />
          </Modal.Header>

          <Stack p="1.25rem" gap="1rem" align="center">
            <Text fz="sm" c="navy.7" ta="center">
              Extract skills, research areas, publications and grants from the CV to your profile.
            </Text>

            <Text fz="sm" fw="600" c="navy.7">
              Upload CV
            </Text>

            <Box
              w="100%"
              maw={220}
              p="1.25rem"
              bdrs="md"
              style={{
                border: "1px dashed var(--mantine-color-navy-4)",
                backgroundColor: "var(--mantine-color-gray-0)",
              }}
            >
              <Stack align="center" gap="0.75rem">
                <IconFileText
                  size={32}
                  stroke={1.5}
                  color="var(--mantine-color-navy-7)"
                />
                <FileButton onChange={handleUpload} accept="application/pdf">
                  {(props) => (
                    <Button {...props} bg="navy.7" radius="xl" size="sm">
                      Upload
                    </Button>
                  )}
                </FileButton>
              </Stack>
            </Box>

            {file ? (
              <Group gap="6" wrap="nowrap" maw="100%">
                <IconFileText size={14} color="var(--mantine-color-dimmed)" />
                <Text fz="xs" c="dimmed" truncate>
                  {file.name}
                </Text>
              </Group>
            ) : null}

            <Text fz="xs" c="dimmed">
              Format: PDF
            </Text>
          </Stack>

          <Group justify="flex-end" p="0 1.25rem 1.25rem">
            <Button
              bg="navy.7"
              radius="md"
              disabled={!file || extractMutation.isPending}
              onClick={handleExtract}
              loading={extractMutation.isPending}
            >
              Extract
            </Button>
          </Group>
        </Modal.Content>
      </Modal.Root>
    );
  }

  //Success summary
  if (results) {
    const rows: [string, SectionResult | undefined][] = [
      ["SKILLS & RESEARCH AREAS", results.profile],
      ["PUBLICATIONS", results.publications],
      ["GRANTS", results.grants],
    ];

    return (
      <Modal.Root opened={opened} onClose={handleClose} size="500px" centered>
        <Modal.Overlay />
        <Modal.Content bdrs="lg">
          <Modal.Header bg="navy.7" p="1rem 1.25rem">
            <Modal.Title c="white" fw="700" fz="lg">
              Resume Extracted
            </Modal.Title>
            <Modal.CloseButton c="white" />
          </Modal.Header>

          <Stack p="1.25rem" gap="1rem">
            {rows
              .filter(([, result]) => result)
              .map(([label, result]) => (
                <Group key={label} gap="0.75rem" align="flex-start" wrap="nowrap">
                  {result!.ok ? (
                    <IconCheck size={18} color="var(--mantine-color-green-7)" />
                  ) : (
                    <IconX size={18} color="var(--mantine-color-red-7)" />
                  )}
                  <Stack gap="0.125rem">
                    <Text fw="600" fz="sm" c="navy.7">
                      {label}
                    </Text>
                    <Text fz="sm" c={result!.ok ? "dimmed" : "red.7"}>
                      {result!.text}
                    </Text>
                  </Stack>
                </Group>
              ))}
          </Stack>

          <Group justify="flex-end" p="0 1.25rem 1.25rem">
            <Button bg="navy.7" radius="md" onClick={handleClose}>
              Done
            </Button>
          </Group>
        </Modal.Content>
      </Modal.Root>
    );
  }

  //Review & Edit
  const publications = editedData?.publications ?? [];
  const grants = editedData?.grants ?? [];
  const importablePubs = importableIndexes(publications, publicationProblem);
  const importableGrants = importableIndexes(grants, grantProblem);

  return (
    <Modal.Root opened={opened} onClose={handleClose} size="600px" centered>
      <Modal.Overlay />
      <Modal.Content bdrs="lg">
        <Modal.Header bg="navy.7" p="1rem 1.25rem">
          <Modal.Title c="white" fw="700" fz="lg">
            Review Extracted Data
          </Modal.Title>
          <Modal.CloseButton c="white" disabled={saving} />
        </Modal.Header>

        <ScrollArea.Autosize mah="65vh" type="auto" offsetScrollbars>
          <Stack p="1.25rem" gap="1.5rem">
            <Text fz="xs" c="dimmed">
              Extracted items are added to your profile. Nothing you've already added is removed.
            </Text>

            <Stack gap="0.5rem">
              <SectionHeader title="SKILLS" total={editedData?.skills.length ?? 0} />
              <TagsInput
                placeholder="Edit skills or add more..."
                value={editedData?.skills ?? []}
                onChange={(values) =>
                  setEditedData((prev) => ({
                    ...prev!,
                    skills: values,
                  }))
                }
                radius="md"
              />
            </Stack>

            <Stack gap="0.5rem">
              <SectionHeader title="RESEARCH AREAS" total={editedData?.researchAreas.length ?? 0} />
              <TagsInput
                placeholder="Edit research areas or add more..."
                value={editedData?.researchAreas ?? []}
                onChange={(values) =>
                  setEditedData((prev) => ({
                    ...prev!,
                    researchAreas: values,
                  }))
                }
                radius="md"
              />
            </Stack>

            <Stack gap="0.5rem">
              <SectionHeader
                title={`PUBLICATIONS (${publications.length})`}
                total={importablePubs.size}
                selected={selectedPubs.size}
                onToggleAll={(checked) => setSelectedPubs(checked ? importablePubs : new Set())}
              />
              {publications.length === 0 ? (
                <Text fz="sm" c="dimmed">
                  No publications were found in this CV.
                </Text>
              ) : (
                publications.map((pub, i) => (
                  <PublicationReviewCard
                    key={i}
                    pub={pub}
                    checked={selectedPubs.has(i)}
                    onChange={(checked) => toggle(setSelectedPubs, i, checked)}
                  />
                ))
              )}
            </Stack>

            <Stack gap="0.5rem">
              <SectionHeader
                title={`GRANTS (${grants.length})`}
                total={importableGrants.size}
                selected={selectedGrants.size}
                onToggleAll={(checked) => setSelectedGrants(checked ? importableGrants : new Set())}
              />
              {grants.length === 0 ? (
                <Text fz="sm" c="dimmed">
                  No grants were found in this CV.
                </Text>
              ) : (
                grants.map((grant, i) => (
                  <GrantReviewCard
                    key={i}
                    grant={grant}
                    checked={selectedGrants.has(i)}
                    onChange={(checked) => toggle(setSelectedGrants, i, checked)}
                  />
                ))
              )}
            </Stack>
          </Stack>
        </ScrollArea.Autosize>

        <Group
          justify="flex-end"
          gap="sm"
          p="1rem 1.25rem 1.25rem"
          style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}
        >
          <Button variant="outline" radius="md" onClick={resetToUpload} disabled={saving}>
            Back
          </Button>
          <Button
            bg="navy.7"
            radius="md"
            onClick={handleConfirm}
            loading={saving}
            disabled={saving}
          >
            {saving ? (
              <Group gap="sm">
                <Loader size="xs" color="white" />
                <span>Updating...</span>
              </Group>
            ) : (
              "Confirm"
            )}
          </Button>
        </Group>
      </Modal.Content>
    </Modal.Root>
  );
}
