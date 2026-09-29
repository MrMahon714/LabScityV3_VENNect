'use client';

import { Button, Text, Center, Collapse, Group, Loader, Stack, TextInput, LoadingOverlay, Divider, RangeSlider, Select, Menu, OptionsFilter, ComboboxItem, Card, Modal, Box } from "@mantine/core";
import { IconAdjustmentsHorizontal, IconArticleOff, IconLink, IconPlus, IconSearch } from "@tabler/icons-react";
import LSOrcidLinker from "./ls-orcid-link-modal";
import OrcidInfo from "./ls-orcid-info";
import LSPublication from "./ls-publication";
import LSPublicationFormModal from "./ls-publication-form-modal";
import { useAuthContext } from "@/components/auth/auth-provider";
import { useDebouncedValue, useDisclosure, useIntersection } from "@mantine/hooks";
import { useAddPubByDoi, useDeletePublication, useGetPublicationFacets, usePublications, useSetFeaturedPublication, useSetSavedPublication } from "./use-publications";
import { DoiFormValues, doiSchema } from "@/lib/validations/publication";
import { useForm } from "@mantine/form";
import { MAX_FEATURED_PUBLICATIONS } from "@/lib/constants/publications";
import { useEffect, useRef, useState } from "react";
import { PubFilters } from "@/lib/types/publication";
import { Publication } from "@/lib/types/data";
import { useUserProfile } from "../use-profile";
import { OPENALEX_WORK_TYPE_LABELS } from "@/lib/constants/openalex";
import LSScholarLinker from "./ls-scholar-link-modal";

export default function LSPublicationsList({
  userId,
  autoOpenOrcid = false,
}: {
  userId: string;
  autoOpenOrcid?: boolean;
}) {  
  const { user, loading: userLoading } = useAuthContext();
  const isOwner = user?.id === userId;

  const { data: profile } = useUserProfile(userId);
  
  const { 
    data: pubFacets, 
    isLoading: isLoadingFacets, 
    isError: isErrorFacets
  } = useGetPublicationFacets(userId);
  const optionsFilter: OptionsFilter = ({ options, search }) => {
    const splittedSearch = search.toLowerCase().trim().split(' ');
    return (options as ComboboxItem[]).filter((option) => {
      const words = option.label.toLowerCase().trim().split(' ');
      return splittedSearch.every((searchWord) => words.some((word) => word.includes(searchWord)));
    });
  };

  const [filters, setFilters] = useState<PubFilters>({
    search: '',
    year: null,
    tagId: null,
    type: null,
    sort: 'newest'
  });
  const [searchInput, setSearchInput] = useState('');
  const [debouncedInput] = useDebouncedValue(searchInput, 300);

  const activeFilters: PubFilters = { ...filters, search: debouncedInput.trim() };

  const {
    data: userPubs,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingUserPubs,
    isError: isErrorUserPubs,
    isFetching: isFetchingPubs
  } = usePublications(userId, activeFilters); 
  const publications = userPubs?.pages.flatMap((p) => p.publications) ?? [];

  const { ref: scrollRef, entry } = useIntersection({
    rootMargin: "200px",
    threshold: 1
  });

  const wasIntersecting = useRef(false);
  useEffect(() => {
    const isIntersecting = entry?.isIntersecting ?? false;

    if(isIntersecting && !wasIntersecting.current && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }

    wasIntersecting.current = isIntersecting;
  }, [entry?.isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const doiForm = useForm<DoiFormValues>({
    mode: 'uncontrolled',
    initialValues: { doi: ''},
    validate: {
      doi: (val) => {
        if(!val.trim()) return null;
        const res = doiSchema.safeParse(val);
        return res.success ? null : res.error.issues[0].message;
      }
    },
    validateInputOnBlur: true
  });

  const addPubByDoi = useAddPubByDoi({
    userId,
    onSuccess: () => {
      doiForm.reset();
      closeDoiModal();
    },
  });
    
  const handleDoiSubmit = doiForm.onSubmit((vals) => {
    if (!vals.doi.trim()) return;
    addPubByDoi.mutate(vals.doi);
  });
  
  const deletePub = useDeletePublication(userId);

  const setFeaturedPub = useSetFeaturedPublication(userId);
  const featuredCount = publications?.filter((p) => p.is_featured).length ?? 0;
  
  const setSavedPub = useSetSavedPublication(userId);

  const [doiModalOpened, { open: openDoiModal, close: closeDoiModal }] = useDisclosure(false);

  const [pubModal, setPubModal] = useState<Publication | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const sessionRef = useRef(0);

  const openPubModal = (pub: Publication) => {
    sessionRef.current++;
    setPubModal(pub);
    setModalOpened(true);
  };

  if(isLoadingUserPubs || isLoadingFacets || userLoading) {
    return (
      <Center py='xl'>
        <Loader />
      </Center>
    )
  }

  if(isErrorUserPubs) {
    return (
      <Text ta='center' c='red' py='xl'>
        Failed to load publications...
      </Text>
    )
  }

  return (
    <Stack w='100%' maw='800'>
      {
        isOwner &&
        <LSPublicationFormModal
          key={`${sessionRef.current}`}
          userId={userId}
          pub={pubModal ?? undefined}
          opened={modalOpened}
          onClose={() => setModalOpened(false)}
          onClosed={() => setPubModal(null)}
        />
      }
      <Group wrap='nowrap'>
        <Stack gap='0'>
          <Text fw='bold'>Publications</Text>
          <Text size='xs' c='dimmed'>{pubFacets?.count ?? 0} publications {isOwner ? ' on your profile' : `from ${profile?.first_name} ${profile?.last_name}`}</Text>
        </Stack>
        {
          isOwner && 
          <>
          <Group flex="1" justify="right" wrap="nowrap">
            <Modal.Root
              opened={doiModalOpened}
              onClose={closeDoiModal}
              centered
            >
              <Modal.Overlay />
              <Modal.Content>
                <Modal.Header style={{ borderBottom: '1px solid var(--mantine-color-gray-4)' }}>
                  <Group align='flex-start' justify='space-between' w='100%'>
                    <Modal.Title>
                      <Group>
                        <Box bg='navy.3' bdrs='md' p='8'>
                          <IconLink />
                        </Box>
                        <Stack gap='0'>
                          <Text fw='700'>Add Research via DOI</Text>
                          <Text fz='xs' c='dimmed'>Fetch publiation metadata from OpenAlex</Text>
                        </Stack>                 
                      </Group>
                    </Modal.Title>
                    <Modal.CloseButton />
                  </Group>
                </Modal.Header>
                <Modal.Body>
                  <form onSubmit={handleDoiSubmit}>
                    <Stack gap="md" pt='md'>
                      <Group>
                        <TextInput
                          flex='1'
                          placeholder="doi.org/..."
                          bdrs="md"
                          disabled={addPubByDoi.isPending}
                          data-autofocus
                          key={doiForm.key("doi")}
                          {...doiForm.getInputProps("doi")}
                        />
                      </Group>
                      <Group justify="flex-end">
                        <Button variant="outline" onClick={closeDoiModal} disabled={addPubByDoi.isPending}>
                          Cancel
                        </Button>
                        <Button type="submit" loading={addPubByDoi.isPending}
                          leftSection={<IconSearch size='1rem'/>}
                        >
                          Fetch
                        </Button>
                      </Group>
                    </Stack>
                  </form>
                </Modal.Body>
                
              </Modal.Content>
            </Modal.Root>
            <Button  onClick={openDoiModal} rightSection={<IconPlus size="1rem" />}>
              Add Research
            </Button>
          </Group>
          <Group wrap='nowrap'>
            <LSScholarLinker userId={userId} />
            <LSOrcidLinker userId={userId} autoOpen={autoOpenOrcid}/>
            {/*<OrcidInfo size='2rem' />*/}
          </Group>
          </>
        }
      </Group>
      
      {
        isErrorFacets ?
        <Text c='red' ta='center'>Failed to load user publication metadata</Text>
        :
        <Stack>
          <TextInput 
            placeholder='Search by publication title'
            styles={{ input: { background: 'var(--mantine-color-gray-0)' } }}
            leftSection={<IconSearch stroke='1.75' size='1rem' color='var(--mantine-color-gray-5)'/>}
            onChange={(e) => setSearchInput(e.currentTarget.value)}
          />
          <Group justify='space-between' wrap='nowrap'>
            <Group>
              <Select
                placeholder='Year'
                data={pubFacets?.years.map(
                  (y) => ({ 
                    value: String(y.year), label: `${y.year} (${y.count})`
                  })) ?? []
                }
                clearable
                onChange={(y) => setFilters((prev) => ({ ...prev, year: y }))}
                comboboxProps={{ shadow: 'sm' }}
                w='125'
              />
              <Select 
                placeholder='Research Topic' 
                data={pubFacets?.tags.map(
                  (tag) => ({ 
                    value: String(tag.id), label: `${tag.name} (${tag.count})`
                  })) ?? []
                }
                clearable
                searchable
                filter={optionsFilter}
                nothingFoundMessage='No Matching Topics...'
                onChange={(t) => setFilters((prev) => ({ ...prev, tagId: t }))}
                comboboxProps={{ shadow: 'sm' }}
                w='200'
              />
              <Select 
                placeholder='Publication Type'
                data={pubFacets?.types.map(
                  (t) => ({ 
                    value: String(t.type), label: `${OPENALEX_WORK_TYPE_LABELS[t.type]} (${t.count})`
                  })) ?? []
                }
                clearable
                onChange={(type) => setFilters((prev) => ({ ...prev, type }))}
                comboboxProps={{ shadow: 'sm' }}
                w='175'
              />
            </Group>
            <Select 
              w='125' 
              placeholder='Sort by' 
              data={[
                {value: 'newest', label: 'Newest'}, 
                {value: 'oldest', label: 'Oldest'}
              ]}
              allowDeselect={false}
              onChange={(sort) => setFilters((prev) => ({ ...prev, sort: (sort as 'newest' | 'oldest') ?? 'newest' }))}
              comboboxProps={{ shadow: 'sm' }}
              defaultValue='newest'
              leftSection={<IconAdjustmentsHorizontal stroke='1' color='var(--mantine-color-gray-5)'/>}
            />
          </Group>
        </Stack> 
      }
      <Divider color='gray.4'/>

        <Stack pos='relative'>
          {
            (addPubByDoi.isPending || (isFetchingPubs && !isFetchingNextPage)) &&
            <Loader mx='auto' />
          }
          {/* <LoadingOverlay
            visible={addPubByDoi.isPending || (isFetchingPubs && !isFetchingNextPage)}
            loaderProps={{ children: '' }}
          /> */}
          {
            publications.length > 0
            ?
            publications.map((pub, i) => 
              <LSPublication 
                key={pub.publication_id}
                pub={pub}
                isOwner={isOwner}
                onDeleteClick={() => deletePub.mutate(pub.publication_id)}
                isDeleting={deletePub.isPending && deletePub.variables === pub.publication_id}
                onFeaturedClick={() => setFeaturedPub.mutate({ 
                  publicationId: pub.publication_id, 
                  isFeatured: !pub.is_featured
                })}
                featureBtnDisabled={!pub.is_featured && featuredCount >= MAX_FEATURED_PUBLICATIONS}
                onSaveClick={() => setSavedPub.mutate({ publicationId: pub.publication_id, isSaved: !pub.isSaved })}
                onEditClick={() => openPubModal(pub)}
              />
            )
            :
            <Stack justify='center' align='center'>
              <IconArticleOff color='var(--mantine-color-dimmed)' size={64} stroke={1}/>
              <Text ta='center' c='dimmed'>
                No Publications Found...
              </Text>
            </Stack>
          }
        </Stack>

      <div ref={scrollRef} style={{ height: 1 }}/>

      { isFetchingNextPage && 
        <Center py='md'>
          <Loader size='sm' />
        </Center>
      }
    </Stack>
  );
}
