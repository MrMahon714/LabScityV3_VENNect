import { 
  Button, 
  Divider, 
  Group, 
  Modal, 
  TextInput,
  Text,
  Stack,
  Anchor,
  Center,
  Loader,
  Pagination,
  SimpleGrid,
  Checkbox,
  Chip,
  LoadingOverlay,
  Box,
  Card
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import OrcidInfo from "./ls-orcid-info";
import { useForm } from "@mantine/form";
import { orcidSchema } from "@/lib/validations/publication";
import { useEffect, useMemo, useRef, useState } from "react";
import { ParsedOpenAlexWork, PublicationType } from "@/lib/types/publication";
import { ApiResponse } from "@/lib/types/api";
import { useQuery } from "@tanstack/react-query";
import LSPublicationReviewItem from "./ls-publication-review-item";
import { useBulkInsertPublications } from "./use-publications";
import { IconLink } from "@tabler/icons-react";
import { OPENALEX_WORK_TYPE_LABELS } from "@/lib/constants/openalex";
import { OpenAlexWorkType } from "@/lib/types/openalex";

type LSOrcidLinkerProps = {
  userId: string;
  autoOpen?: boolean;
};

export default function LSOrcidLinker({
  userId,
  autoOpen = false,
}: LSOrcidLinkerProps) {
  const [orcidInputOpened, { open: openOrcidInput, close: closeOrcidInput }] = useDisclosure(false);
  const autoOpenedRef = useRef(false);
  const [orcid, setOrcid] = useState<string | null>(null);
  const [activePage, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (autoOpen && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      openOrcidInput();
    }
  }, [autoOpen, openOrcidInput]);

  const orcidForm = useForm({
    mode: 'uncontrolled',
    initialValues: { orcid: '' },
    validate: {
      orcid: (val) => {
        if (!val.trim()) return null;
        const res = orcidSchema.safeParse(val);
        return res.success ? null : res.error.issues[0].message;
      }
    },
    validateInputOnBlur: true,
  })

  function chunk<T>(array: T[], size: number): T[][] {
    if (!array.length) {
      return [];
    }
    const head = array.slice(0, size);
    const tail = array.slice(size);
    return [head, ...chunk(tail, size)];
  }

  const { data: publications, isFetching, isError, error } =
    useQuery({
      queryKey: ["openalex", "publications", orcid],
      queryFn: async () => {
        const res = await fetch(`/api/openalex?orcid=${orcid}`);
        const json: ApiResponse<ParsedOpenAlexWork[]> = await res.json();
        if (!json.success) throw new Error(json.error);
        return json.data;
      },
      enabled: !!orcid,
    });

  useEffect(() => {
    if (publications) {
      setSelected(new Set(publications.map((p) => p.doi!)))
    }
  }, [publications])

  const handleOrcidSubmit = orcidForm.onSubmit(async (vals) => {
    if (!vals.orcid.trim()) return;
    setOrcid(orcidSchema.parse(vals.orcid));
    setPage(1);
  })

  const bulkInsertPublications = useBulkInsertPublications({
    userId,
    onSuccess: () => closeOrcidInput()
  });

  const handleImportPublications = () => {
    bulkInsertPublications.mutate({
      publications: publications!.filter((w) => selected.has(w.doi!)),
      orcid: orcid ?? undefined,
    })
  };

  const chunkedPubs = publications ? chunk(publications, 20) : [];

  const toggleSelected = (doi: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(doi);
      } else {
        next.delete(doi);
      }
      return next;
    });
  };

  const allChecked =
    !!publications && publications.length > 0 && selected.size === publications.length;
  const someChecked = selected.size > 0 && !allChecked;

  const toggleSelectAll = (checked: boolean) => {
    setSelected(checked && publications
      ?
      new Set(publications.map((pub) => pub.doi!))
      :
      new Set()
    );
  }

  const groups = useMemo(() => {
    const m = new Map<PublicationType, string[]>();
    for (const pub of publications ?? []) {
      const key = pub.type ?? 'other'
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(pub?.doi ?? '');
    }
    return m;
  }, [publications])

  const toggleGroup = (key: PublicationType) => {
    const dois = groups.get(key);
    const allOn = dois?.every((d) => selected.has(d));
    setSelected((prev) => {
      const next = new Set(prev);
      dois!.forEach((d) => (allOn ? next.delete(d) : next.add(d)));
      return next;
    });
  }

  return (
    <>
      <Modal.Root size='800' centered opened={orcidInputOpened} onClose={closeOrcidInput}>
        <Modal.Overlay />
        <Modal.Content>
          <Modal.Header
            style={{
              borderBottom: '1px solid var(--mantine-color-gray-4)'
            }}
          >
            <Group align='flex-start' justify='space-between' w='100%'>
              <Modal.Title>
                <Group>
                  <Box bg="var(--ls-icon-badge-bg)" c="var(--ls-icon-badge-color)" bdrs="md" p="8">
                    <IconLink />
                  </Box>
                  <Stack gap='0'>
                    <Text fw='700'>Add Research via ORCID iD</Text>
                    <Text fz='xs' c='dimmed'>Fetch publication metadata from OpenAlex using your ORCID iD</Text>
                  </Stack>
                </Group>
              </Modal.Title>
              <Modal.CloseButton size='40' />
            </Group>
          </Modal.Header>

          <Modal.Body pb='0' pt='md'>
            <Stack gap='sm' pos='relative'>
              <LoadingOverlay visible={bulkInsertPublications.isPending} />
              <Stack gap='xs'>
                <form onSubmit={handleOrcidSubmit} style={{ flex: 1 }}>
                  <Stack>
                    <Card bg="var(--ls-navy-tint)" shadow='none' bd='none' bdrs={0}>
                      <Group wrap='nowrap'>
                        <Text c='' fz='sm' flex='1'>
                          Enter your ORCID iD to import publications via {" "}
                          <Anchor c='navy.6' fz='sm' href='https://openalex.org/about' target="_blank" rel="noopener noreferrer">
                            OpenAlex
                          </Anchor>.
                          You can review each publication before adding it your profile.
                        </Text>
                        <Group gap='xs'>
                          <Anchor
                            c='navy.6'
                            underline='always'
                            w='fit-content'
                            href='https://info.orcid.org/what-is-my-id/'
                            size='sm'
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Get your iD
                          </Anchor>
                          <OrcidInfo size='2rem' />
                        </Group>
                      </Group>
                    </Card>
                    <Group>
                      <TextInput
                        flex='1'
                        placeholder="https://orcid.org/0000-0001-2345-6789"
                        key={orcidForm.key("orcid")}
                        {...orcidForm.getInputProps("orcid")}
                        disabled={isFetching || bulkInsertPublications.isPending}
                      />
                      <Button type='submit' disabled={isFetching || bulkInsertPublications.isPending}>
                        Find Publications
                      </Button>
                    </Group>
                  </Stack>
                </form>
              </Stack>
              <Divider color='gray.4' />
              {
                isFetching ?

                  <Center py='100'>
                    <Loader />
                  </Center>

                  : isError ?

                    <Text ta='center' size='sm' c='red' py='100'>
                      {error instanceof Error ? error.message : "Failed to fetch publications"}
                    </Text>

                    : !publications ?

                      <Text ta='center' size='sm' c='dimmed' py='100'>
                        Once you link your account with your ORCID iD, your publications will appear here
                      </Text>

                      : publications.length === 0 ?

                        <Text ta='center' size='sm' c='dimmed' py='100'>
                          No publications found for this ORCID iD. Are you sure it is correct?
                        </Text>

                        :

                        <Stack>
                          <Text size="sm" c="dimmed">
                            {publications.length} publications found ·{" "}
                            <Text span c="var(--ls-text-strong)">
                              {selected.size} selected
                            </Text>
                          </Text>
                          <Checkbox
                            checked={allChecked}
                            indeterminate={someChecked}
                            label='Select all'
                            onChange={(e) => toggleSelectAll(e.currentTarget.checked)}
                            color="var(--ls-accent)"
                            radius='sm'
                          />
                          <Chip.Group multiple>
                            <Group gap='4'>
                              {
                                [...groups]
                                  .sort(([, aWorks], [, bWorks]) => bWorks.length - aWorks.length)
                                  .map(([type, dois]) => {
                                    const selectedInGroup = dois.filter((d) => selected.has(d)).length
                                    const allOfGroup = selectedInGroup === dois.length;

                                    return (
                                      <Chip
                                        key={type}
                                        checked={allOfGroup}
                                        onChange={() => toggleGroup(type)}
                                        color="var(--ls-accent)"
                                        size='xs'
                                      >
                                        {OPENALEX_WORK_TYPE_LABELS[type]} ({selectedInGroup}/{dois.length})
                                      </Chip>
                                    )
                                  })
                              }
                            </Group>
                          </Chip.Group>
                          <Pagination radius='sm' total={chunkedPubs!.length} value={activePage} onChange={setPage} />
                          <SimpleGrid cols={2}>
                            {
                              chunkedPubs[activePage - 1]?.map((pub) =>
                                <LSPublicationReviewItem
                                  key={pub.doi}
                                  pub={pub}
                                  selected={selected.has(pub.doi!)}
                                  onSelectChange={(checked) => toggleSelected(pub.doi!, checked)}
                                />
                              )
                            }
                          </SimpleGrid>
                          <Pagination radius='sm' total={chunkedPubs!.length} value={activePage} onChange={setPage} />
                        </Stack>
              }
              {
                publications &&
                <Group
                  justify='flex-end'
                  gap='sm'
                  py='md'
                  style={{
                    position: 'sticky',
                    bottom: '0',
                    background: 'var(--mantine-color-body)',
                    borderTop: '1px solid var(--mantine-color-gray-4)',
                    marginInline: 'calc(var(--mantine-spacing-md) * -1)',
                    paddingInline: 'var(--mantine-spacing-md)',
                  }}
                >
                  <Button variant='outline' onClick={closeOrcidInput}>Cancel</Button>
                  <Button onClick={handleImportPublications} disabled={bulkInsertPublications.isPending}>
                    Import
                  </Button>
                </Group>
              }
            </Stack>
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
      <Button bg='gray.0' variant='outline' onClick={openOrcidInput}>
        Add With ORCID iD
      </Button>
    </>
  );
}
