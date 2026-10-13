import { ActionIcon, Button, Image, FileInput, Group, Modal, Select, Stack, Textarea, TextInput, Text, MultiSelect, Tooltip, FileButton, Card, Box } from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { useForm, isNotEmpty } from "@mantine/form";
import { IconBox, IconPlus, IconTrash, IconUpload, IconX } from "@tabler/icons-react";
import { createProductSchema, updateProductSchema, type CreateProductValues } from "@/lib/validations/product";
import { useEffect, useMemo, useState } from "react";
import { MAX_IMAGE_UPLOADS as MAX_PRODUCT_PREVIEWS, MAX_PRODUCT_SUMMARY_LENGTH, PRODUCT_TYPE_LABELS, ProductType } from "@/lib/constants/product";
import { useCreateProduct, useSearchTags, useUpdateProduct } from "./use-products";
import { Product, TagValue, UploadProductPreview } from "@/lib/types/data";
import { LSTagsInput } from "./ls-tags-input";

const ACCEPTED_FILE_TYPES = "image/jpeg,image/png,image/webp";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

type ExistingImage = {
  image_path: string;
  url: string;
  width: number;
  height: number;
};

type ProductFormValues = {
  title: string;
  short_summary: string;
  links: { kind: 'website' | 'github' | 'other'; url: string; label: string }[];
  contributors: string[];
  product_type: ProductType;
  tags: TagValue[];
};

export default function LSProductFormModal({
  userId, product, opened, onClose
}: {
  userId: string, product?: Product, opened: boolean, onClose: () => void
}) {
  const [confirmCloseOpened, { open: openConfirmClose, close: closeConfirmClose }] = useDisclosure(false);

  const [images, setImages] = useState<UploadProductPreview[]>([]);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);

  const [tagsSearch, setTagsSearch] = useState('');
  const [debouncedTagsSearch] = useDebouncedValue(tagsSearch, 300);
  const searchTags = useSearchTags(debouncedTagsSearch);

  const editingProduct = !!product;

  const form = useForm<ProductFormValues>({
    mode: 'controlled',
    initialValues: {
      title: "",
      short_summary: "",
      links: [
        { kind: 'website', url: '', label: ''},
        { kind: 'github', url: '', label: ''},
      ],
      contributors: [],
      product_type: 'other',
      tags: [],
    },
    validateInputOnBlur: true,
    validate: {
      title: isNotEmpty('Title is required'),
    },
  });
  const hasUnsavedChanges =
    form.isDirty() || images.length > 0 || removedPaths.length > 0;
  const summary = form.getValues().short_summary ?? '';

  const totalImages = existingImages.length + images.length;
  const uploadPreviewsBtnDisabled = totalImages >= MAX_PRODUCT_PREVIEWS;

  const resetImageState = () => {
    images.forEach((img) => URL.revokeObjectURL(img.url));
    setImages([]);
    setExistingImages([]);
    setRemovedPaths([]);
  };

  const createProduct = useCreateProduct({
    userId,
    onSuccess: () => {
      resetImageState();
      form.reset();
      onClose();
    }
  });

  const updateProduct = useUpdateProduct({
    userId,
    onSuccess: () => {
      resetImageState();
      form.reset();
      onClose();
    }
  })

  const confirmDiscard = () => {
    resetImageState();
    form.reset();
    onClose();
    closeConfirmClose();
  }

  const handleProductSubmit = form.onSubmit((submittedProduct) => {
    const payload = {
      ...submittedProduct,
      product_type: submittedProduct.product_type,
      links: submittedProduct.links.filter((l) => l.url.trim() !== "")
        .map((link) => ({
          ...link,
          url: /^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`,
          label: link.label.trim() || null
        })),
      tags: submittedProduct.tags
    }

    if(editingProduct) {
      const parsed = updateProductSchema.safeParse(payload);

      if(!parsed.success) {
        parsed.error.issues.forEach((issue) =>
          form.setFieldError(issue.path.join("."), issue.message)
        );
        return;
      }

      updateProduct.mutate({
        product_id: product.product_id,
        updates: parsed.data,
        newImages: images.map((img) => ({ file: img.file, width: img.width, height: img.height })),
        removedPaths,
      })
    }
    else {
      const parsed = createProductSchema.safeParse(payload);

      if(!parsed.success) {
        parsed.error.issues.forEach((issue) =>
          form.setFieldError(issue.path.join("."), issue.message)
        );
        return;
      }

      createProduct.mutate({
        product: parsed.data, images: images.map((img) => (
          { file: img.file, width: img.width, height: img.height }
        ))
      });
    }
  })

  const handleClose = hasUnsavedChanges ? openConfirmClose : onClose;

  const addLinksBtnDisabled = (form.getValues().links?.slice(2).length ?? 0) >= 3;

  const onAddImage = (payload: File[] | null) => {
    if (!payload) return;
    const remaining = Math.max(MAX_PRODUCT_PREVIEWS - totalImages, 0);
    payload.slice(0, remaining).forEach((file) => {
      const url = URL.createObjectURL(file);
      const probe = new window.Image();
      probe.onload = () => {
        setImages((prev) => [
          ...prev,
          { file, url, width: probe.naturalWidth, height: probe.naturalHeight },
        ]);
      };
      probe.src = url;
    });
  };
  const onRemoveImage = (imgUrl: string) => {
    URL.revokeObjectURL(imgUrl);
    setImages((prev) => prev.filter(({url}) => url !== imgUrl))
  }
  const onRemoveExisting = (path: string) => {
    setExistingImages((prev) => prev.filter((img) => img.image_path !== path));
    setRemovedPaths((prev) => [...prev, path]);
  };

  useEffect(() => {
    if(!opened) return;

    if(editingProduct) {
      const website = product.links.find(link => link.kind === 'website') ?? { kind: 'website', url: '', label: '' }
      const github = product.links.find(link => link.kind === 'github') ?? { kind: 'github', url: '', label: '' }
      const others  = product.links.filter((link) => link.kind === "other");

      form.setValues({
        title: product.title,
        short_summary: product.short_summary ?? '',
        links: [website, github, ...others].map(l => ({
          ...l,
          label: l.label ?? '',
          url: l.url ?? '',
        })),
        contributors: product.contributors ?? [],
        product_type: product.product_type ?? 'other',
        tags: product.tags ?? []
      });
      form.resetDirty();

      setImages([]);
      setExistingImages((product.images ?? []).map((img) => ({
        image_path: img.image_path,
        url: img.url,
        width: img.width,
        height: img.height,
      })));
      setRemovedPaths([]);
    }
    else {
      form.reset();
      setImages([]);
      setExistingImages([]);
      setRemovedPaths([]);
    }
  }, [opened, product]);

  return (
    <>
      <Modal.Root opened={confirmCloseOpened} onClose={closeConfirmClose} centered size='sm' zIndex={201}>
        <Modal.Overlay />
        <Modal.Content>
          <Modal.Header style={{ borderBottom: '1px solid var(--mantine-color-gray-4)' }}>
            <Group align='center' justify='space-between' w='100%'>
              <Modal.Title><Text fw='700' fz='lg'>Discard changes?</Text></Modal.Title>
              <Modal.CloseButton />
            </Group>
          </Modal.Header>
          <Modal.Body pb='0' pt='md'>
            <Text size="sm" mb="md">
              You have unsaved changes{images.length > 0 ? ", including images" : ""}.
              Closing now will discard them.
            </Text>
            <Group
              justify="flex-end"
              gap="xs"
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
              <Button variant="outline" onClick={closeConfirmClose}>Keep editing</Button>
              <Button color="red" onClick={confirmDiscard}>Discard</Button>
            </Group>
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
      <Modal.Root size='800' centered opened={opened} onClose={handleClose}>
        <Modal.Overlay />
        <Modal.Content>
          <Modal.Header style={{ borderBottom: '1px solid var(--mantine-color-gray-4)' }}>
            <Group align='flex-start' justify='space-between' w='100%'>
              <Modal.Title>
                <Group>
                  <Box bg='navy.3' bdrs='md' p='8'>
                    <IconBox />
                  </Box>
                  <Stack gap='0'>
                    <Text fw='700'>{editingProduct ? 'Edit Research Product' : 'Add a Research Product'}</Text>
                    <Text fz='xs' c='dimmed'>Share a dataset, tool, or other research output</Text>
                  </Stack>
                </Group>
              </Modal.Title>
              <Modal.CloseButton size='40' />
            </Group>
          </Modal.Header>

          <Modal.Body pb='0' pt='md'>
            <Stack gap='xs' mx='5%' pos='relative'>
              <form
                id='product-form'
                onSubmit={handleProductSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
                    e.preventDefault();
                  }
                }}
              >
                <Stack>
                  <Group align='end'>
                    <TextInput
                      flex='3'
                      label='Product Title'
                      placeholder='e.g. "My Cool Project"'
                      withAsterisk
                      key={form.key('title')}
                      {...form.getInputProps('title')}
                    />
                    <Select
                      flex='1'
                      label='Product Type'
                      placeholder='Type'
                      data={Object
                        .entries(PRODUCT_TYPE_LABELS)
                        .map(([value, label]) => ({ value, label }))
                        .sort((a, b) => a.label.localeCompare(b.label))
                      }
                      comboboxProps={{ shadow: 'sm' }}
                      key={form.key('product_type')}
                      {...form.getInputProps('product_type')}
                    />
                  </Group>
                  <Stack gap='4'>
                    <Textarea
                      label='Short Summary'
                      placeholder="Write a summary about what makes your product interesting"
                      autosize
                      error={summary.length > MAX_PRODUCT_SUMMARY_LENGTH}
                      minRows={2}
                      key={form.key('short_summary')}
                      {...form.getInputProps('short_summary')}
                    />
                    <Text
                      size='xs' c={summary.length > MAX_PRODUCT_SUMMARY_LENGTH ? 'red' : 'dimmed'} ta='right'
                    >
                      {summary.length}/{MAX_PRODUCT_SUMMARY_LENGTH}
                    </Text>
                  </Stack>
                  <Group w='100%' wrap='nowrap' justify='space-between'>
                    <Stack gap='4' align='center'>
                      <Tooltip label='Add screenshots or photos of your product'>
                        <FileButton disabled={uploadPreviewsBtnDisabled} onChange={onAddImage} accept={ACCEPTED_FILE_TYPES} multiple>
                          {(props) =>
                            <Button
                              {...props}
                              w='fit-content'
                              leftSection={
                                <IconUpload
                                  size='1rem'
                                  color={uploadPreviewsBtnDisabled ? 'var(--mantine-color-gray-5)' : 'var(--ls-text-strong)'}
                                />}
                              bg={uploadPreviewsBtnDisabled ? 'gray.2' : 'navy.1'}
                              c={uploadPreviewsBtnDisabled ? 'gray.5' : 'navy.7'}
                              bd={uploadPreviewsBtnDisabled ? undefined : '1px solid gray.4'}
                              fw='normal'
                              disabled={uploadPreviewsBtnDisabled}
                            >
                              Upload Previews
                            </Button>
                          }
                        </FileButton>
                      </Tooltip>
                      <Stack gap='0'>
                        <Text fz='xs' c='dimmed' ta='center' w='160'>
                          JPG, PNG, or WebP
                        </Text>
                        <Text fz='xs' c='dimmed' ta='center' w='160'>
                          Up to 5MB each
                        </Text>
                      </Stack>
                    </Stack>
                    {
                      existingImages.map(({ image_path, url }) =>
                        <Box key={image_path} pos='relative' h='80' w='80'>
                          <ActionIcon
                            pos='absolute'
                            top={-6}
                            right={-6}
                            size='xs'
                            radius='xl'
                            variant='filled'
                            onClick={() => onRemoveExisting(image_path)}
                          >
                            <IconX size='14' />
                          </ActionIcon>
                          <Image src={url} h='80' w='80' bdrs='md' bd='2px solid gray.4' fit='cover' />
                        </Box>
                      )
                    }
                    {
                      images.map(({ url }) =>
                        <Box key={url} pos='relative' h='80' w='80'>
                          <ActionIcon
                            pos='absolute'
                            top={-6}
                            right={-6}
                            size='xs'
                            radius='xl'
                            variant='filled'
                            onClick={() => onRemoveImage(url)}
                          >
                            <IconX size='14' />
                          </ActionIcon>
                          <Image src={url} h='80' w='80' bdrs='md' bd='2px solid gray.4' fit='cover' />
                        </Box>
                      )
                    }
                    {
                      Array.from({ length: Math.max(MAX_PRODUCT_PREVIEWS - totalImages, 0) }).map((_, i) =>
                        <Box key={`ph-${i}`} h='80' w='80' bdrs='md' bd='2px dashed gray.4' />
                      )
                    }
                  </Group>
                  <Group>
                    <TextInput flex='1' label='Website Link' placeholder="https://..."
                      {...form.getInputProps('links.0.url')} />
                    <TextInput flex='1' label='Website Display Name' placeholder='e.g. "My Website"'
                      {...form.getInputProps('links.0.label')} />
                  </Group>
                  <Group>
                    <TextInput flex='1' label='GitHub Link' placeholder="https://github.com/..."
                      {...form.getInputProps('links.1.url')} />
                    <TextInput flex='1' label='GitHub Display Name' placeholder='e.g. "GitHub Repo"'
                      {...form.getInputProps('links.1.label')} />
                  </Group>
                  {
                    form.getValues().links?.slice(2).map((_, i) =>
                      <Group key={i} align='end'>
                        <TextInput flex='1' label={`Link ${i + 1}`} placeholder="https://..."
                          {...form.getInputProps(`links.${i + 2}.url`)} />
                        <TextInput flex='1' label={`Link ${i + 1} Display Name`} placeholder='e.g. "Additional Link"'
                          {...form.getInputProps(`links.${i + 2}.label`)} />
                        <ActionIcon
                          size='lg'
                          bg='red.5'
                          onClick={() => form.removeListItem("links", i + 2)}
                        >
                          <IconTrash stroke={1.5} />
                        </ActionIcon>
                      </Group>
                    )
                  }
                  <Button
                    variant='light'
                    leftSection={<IconPlus size='1rem' />}
                    onClick={() => form.insertListItem("links", { kind: 'other', url: '', label: '' })}
                    disabled={addLinksBtnDisabled}
                    fw='normal'
                    w='fit-content'
                    bd={addLinksBtnDisabled ? undefined : '1px solid gray.4'}
                    bg={addLinksBtnDisabled ? undefined : 'navy.1'}
                  >
                    Add Additional Link
                  </Button>
                  <LSTagsInput
                    value={form.getValues().tags}
                    onChange={(next) => form.setFieldValue('tags', next)}
                    results={searchTags.data ?? []}
                    searchValue={tagsSearch}
                    debouncedSearchValue={debouncedTagsSearch}
                    onSearchChange={setTagsSearch}
                    allowCustom={true}
                    isFetching={searchTags.isFetching}
                    error={form.errors.tags}
                  />
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
              <Button
                type='submit'
                form='product-form'
                loading={editingProduct ? updateProduct.isPending : createProduct.isPending}
              >
                {editingProduct ? 'Save Changes' : 'Submit'}
              </Button>
            </Group>
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>

    </>
  )
}