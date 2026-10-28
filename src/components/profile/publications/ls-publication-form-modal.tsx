import {
  Box, Button, Group, Modal, Select, Stack, Switch, Text, TextInput, TagsInput, Tooltip,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useForm, isNotEmpty } from "@mantine/form";
import { IconBook } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { DateInput, MonthPickerInput } from "@mantine/dates";
import { OPENALEX_WORK_TYPE_LABELS } from "@/lib/constants/openalex";
import type { OpenAlexWorkType } from "@/lib/types/openalex";
import { Publication, TagValue } from "@/lib/types/data";
import { updatePublicationSchema } from "@/lib/validations/publication";
import { useSearchTags } from "../products/use-products";
import { useUpdatePublication } from "./use-publications";
import { LSTagsInput } from "../products/ls-tags-input";

type PublicationFormValues = {
  title: string;
  type: OpenAlexWorkType;
  journal: string;
  date_published: string | null;
  authors: string[];
  is_oa: boolean;
  pdf_available: boolean;
  topics: TagValue[];
};

export default function LSPublicationFormModal({
  userId, pub, opened, onClose, onClosed
}: {
  userId: string, pub?: Publication, opened: boolean, onClose: () => void, onClosed: () => void
}) {
  const [tagsSearch, setTagsSearch] = useState('');
  const [debouncedTagsSearch] = useDebouncedValue(tagsSearch, 300);
  const searchTags = useSearchTags(debouncedTagsSearch);

  const sourcePdfUrl = pub?.pdf_url ?? null;
  const hasSourcePdf = !!sourcePdfUrl;

  const updatePub = useUpdatePublication({
    userId,
    onSuccess: () => onClose(),
  });

  const form = useForm<PublicationFormValues>({
    mode: 'controlled',
    initialValues: {
      title: "",
      type: 'journal_article',
      journal: "",
      date_published: null,
      authors: [],
      is_oa: false,
      pdf_available: false,
      topics: [],
    },
    validateInputOnBlur: true,
    validate: {
      title: isNotEmpty('Title is required'),
    },
  });

  const doiUrl = pub?.doi ? `doi.org/${pub.doi}` : "—";

  useEffect(() => {
    if (!opened || !pub) return;

    form.setValues({
      title: pub.title ?? "",
      type: (pub.type ?? 'journal_article') as OpenAlexWorkType,
      journal: pub.journal ?? "",
      date_published: pub.date_published ?? null,
      authors: pub.authors ?? [],
      is_oa: pub.is_oa ?? false,
      pdf_available: !!pub.pdf_url,
      topics: (pub.tags as unknown as TagValue[]) ?? [],
    });
    form.resetDirty();
  }, [opened, pub]);

  const handleSubmit = form.onSubmit((values) => {
    if (!pub) return;

    const payload = {
      title: values.title,
      type: values.type,
      journal: values.journal.trim() || null,
      date_published: values.date_published || null,
      authors: values.authors,
      is_oa: values.is_oa,
      // keep the OpenAlex pdf_url if the toggle is on AND one exists, else null
      pdf_url: values.pdf_available && hasSourcePdf ? sourcePdfUrl : null,
      tags: values.topics,
    };

    const parsed = updatePublicationSchema.safeParse(payload);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const path = issue.path[0] === "tags" ? "topics" : issue.path.join(".");
        form.setFieldError(path, issue.message);
      });
      return;
    }

    updatePub.mutate({ publication_id: pub.publication_id, updates: parsed.data });
  });

  return (
    <Modal.Root size='700' centered opened={opened} onClose={onClose}>
      <Modal.Overlay />
      <Modal.Content>
        <Modal.Header style={{ borderBottom: '1px solid var(--mantine-color-gray-4)' }}>
          <Group align='flex-start' justify='space-between' w='100%'>
            <Modal.Title>
              <Group>
                <Box bg="var(--ls-icon-badge-bg)" c="var(--ls-icon-badge-color)" bdrs="md" p="8">
                  <IconBook />
                </Box>
                <Stack gap='0'>
                  <Text fw='700'>Edit Publication</Text>
                  <Text fz='xs' c='dimmed'>Update details for this publication</Text>
                </Stack>
              </Group>
            </Modal.Title>
            <Modal.CloseButton size='40' />
          </Group>
        </Modal.Header>

        <Modal.Body pb='0' pt='md'>
          <Stack gap='xs' mx='2%'>
            <form
              id='publication-form'
              onSubmit={handleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
                  e.preventDefault();
                }
              }}
            >
              <Stack>
                <TextInput
                  label='DOI'
                  description="DOI can't be changed"
                  value={doiUrl}
                  readOnly
                  disabled
                />

                <Group align='end'>
                  <TextInput
                    flex='3'
                    label='Title'
                    placeholder='Publication title'
                    withAsterisk
                    key={form.key('title')}
                    {...form.getInputProps('title')}
                  />
                  <Select
                    flex='1'
                    label='Type'
                    placeholder='Type'
                    data={Object.entries(OPENALEX_WORK_TYPE_LABELS)
                      .map(([value, label]) => ({ value, label }))
                      .sort((a, b) => a.label.localeCompare(b.label))}
                    comboboxProps={{ shadow: 'sm' }}
                    key={form.key('type')}
                    {...form.getInputProps('type')}
                  />
                </Group>

                <Group>
                  <TextInput
                    flex='2'
                    label='Journal'
                    placeholder='e.g. "Nature"'
                    key={form.key('journal')}
                    {...form.getInputProps('journal')}
                  />
                  <MonthPickerInput
                    flex='1'
                    label='Publication Date'
                    placeholder='Pick a date'
                    clearable
                    valueFormat='MMM YYYY'
                    key={form.key('date_published')}
                    {...form.getInputProps('date_published')}
                  />
                </Group>

                <TagsInput
                  label='Authors'
                  placeholder='Type a name and press Enter'
                  clearable
                  key={form.key('authors')}
                  {...form.getInputProps('authors')}
                />

                <LSTagsInput
                  value={form.getValues().topics}
                  onChange={(next) => form.setFieldValue('topics', next)}
                  results={searchTags.data ?? []}
                  searchValue={tagsSearch}
                  debouncedSearchValue={debouncedTagsSearch}
                  onSearchChange={setTagsSearch}
                  allowCustom={true}
                  isFetching={searchTags.isFetching}
                  error={form.errors.topics}
                />

                <Group justify='space-between' mt='xs'>
                  <Text fz='sm' fw='500'>Open Access</Text>
                  <Switch
                    key={form.key('is_oa')}
                    {...form.getInputProps('is_oa', { type: 'checkbox' })}
                  />
                </Group>

                <Group justify='space-between'>
                  <Stack gap='0'>
                    <Text fz='sm' fw='500'>PDF available</Text>
                    <Text fz='xs' c='dimmed'>
                      {hasSourcePdf
                        ? 'Show the PDF link from OpenAlex on this publication'
                        : 'No PDF link is available for this publication'}
                    </Text>
                  </Stack>
                  <Tooltip label='No PDF source to show' disabled={hasSourcePdf}>
                    <Switch
                      disabled={!hasSourcePdf}
                      key={form.key('pdf_available')}
                      {...form.getInputProps('pdf_available', { type: 'checkbox' })}
                    />
                  </Tooltip>
                </Group>
              </Stack>
            </form>
          </Stack>

          <Group
            justify='flex-end'
            gap='sm'
            py='md'
            mt='lg'
            style={{
              position: 'sticky',
              bottom: '0',
              background: 'var(--mantine-color-body)',
              borderTop: '1px solid var(--mantine-color-gray-4)',
              marginInline: 'calc(var(--mantine-spacing-md) * -1)',
              paddingInline: 'var(--mantine-spacing-md)',
            }}
          >
            <Button variant='outline' onClick={onClose} disabled={updatePub.isPending}>Cancel</Button>
            <Button type='submit' form='publication-form' loading={updatePub.isPending}>
              Save Changes
            </Button>
          </Group>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}