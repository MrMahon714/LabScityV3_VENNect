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
import { useForm } from "@mantine/form";
import { orcidSchema } from "@/lib/validations/publication";
import { useEffect, useMemo, useState } from "react";
import { ParsedOpenAlexWork } from "@/lib/types/publication";
import { ApiResponse } from "@/lib/types/api";
import { useQuery } from "@tanstack/react-query";
import { useBulkInsertProducts } from "./use-products";
import { IconBox } from "@tabler/icons-react";
import OrcidInfo from "../publications/ls-orcid-info";
import LSProductReviewItem from "./ls-product-review-item";
import { PRODUCT_TYPE_LABELS, ProductType } from "@/lib/constants/product";

export default function LSOrcidProductsModal({userId}: {userId: string}) {
  const [orcidInputOpened, { open: openOrcidInput, close: closeOrcidInput }] = useDisclosure(false);
  const [orcid, setOrcid] = useState<string | null>(null);
  const [activePage, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  
  const orcidForm = useForm({
    mode: 'uncontrolled',
    initialValues: { orcid: '' },
    validate: {
      orcid: (val) => {
        if(!val.trim()) return null;
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

  const { data: products, isFetching, isError, error } = 
    useQuery({
      queryKey: ["openalex", "products", orcid],
      queryFn: async () => {
        const res = await fetch(`/api/openalex?orcid=${orcid}&type=product`);
        const json: ApiResponse<ParsedOpenAlexWork<ProductType>[]> = await res.json();
        if(!json.success) throw new Error(json.error);

        return json.data;
      },
      enabled: !!orcid,
    });

  useEffect(() => {
    if(products) {
      setSelected(new Set(products.map((p) => p.workId)))
    }
  }, [products])

  const handleOrcidSubmit = orcidForm.onSubmit(async (vals) => {
    if(!vals.orcid.trim()) return;
    setOrcid(orcidSchema.parse(vals.orcid));
    setPage(1);
  })

  const bulkInsertProducts = useBulkInsertProducts({
    userId,
    onSuccess: () => closeOrcidInput()
  });

  const handleImportProducts = () => {
    bulkInsertProducts.mutate(
      products!.filter((w) => selected.has(w.workId))
    )
  };

  const chunkedProducts = products ? chunk(products, 20) : [];

  const toggleSelected = (workId: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(workId);
      } else {
        next.delete(workId);
      }
      return next;
    });
  };

  const allChecked = 
    !!products && products.length > 0 && selected.size === products.length;
  const someChecked = selected.size > 0 && !allChecked;

  const toggleSelectAll = (checked: boolean) => {
    setSelected(checked && products 
      ? 
      new Set(products.map((product) => product.workId))
      : 
      new Set()
    );
  }


  const groups = useMemo(() => {
    const m = new Map<ProductType, string[]>();
    for(const product of products ?? []) {
      const key = product.type ?? 'other'
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(product.workId);
    }
    return m;
  }, [products])

  const toggleGroup = (key: ProductType) => {
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
        <Modal.Content >
          <Modal.Header 
            style={{
              borderBottom: '1px solid var(--mantine-color-gray-4)'
            }}
          >
            <Group align='flex-start' justify='space-between' w='100%'>
              <Modal.Title>
                <Group>
                  <Box bg='navy.3' bdrs='md' p='8'>
                    <IconBox />
                  </Box>
                  <Stack gap='0'>
                    <Text fw='700'>Add Research Products via ORCID iD</Text>
                    <Text fz='xs' c='dimmed'>Automatically find your research products with your ORCID iD</Text>
                  </Stack>          
                </Group>
              </Modal.Title>
              <Modal.CloseButton size='40'/>
            </Group>
          </Modal.Header>

          <Modal.Body pb='0' pt='md'>
            <Stack gap='sm' pos='relative'>
              <LoadingOverlay visible={bulkInsertProducts.isPending}/>
              <Stack gap='xs'>
                <form onSubmit={handleOrcidSubmit} style={{flex: 1}}>
                  <Stack >
                    <Card bg="var(--ls-navy-tint)" shadow='none' bd='none' bdrs={0}>
                      <Group wrap='nowrap'>
                        <Text c='' fz='sm' flex='1'>
                          Enter your ORCID iD to find research products via {" "}
                          <Anchor c='navy.6' fz='sm' href='https://openalex.org/about'target="_blank" rel="noopener noreferrer">
                            OpenAlex
                          </Anchor>. 
                          You can review each item before adding it your profile.
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
                          <OrcidInfo size='2rem'/>
                        </Group>
                      </Group>
                    </Card>
                    <Group>
                      <TextInput 
                        flex='1' 
                        placeholder="https://orcid.org/0000-0001-2345-6789"
                        key={orcidForm.key("orcid")}
                        {...orcidForm.getInputProps("orcid")}
                        disabled={isFetching || bulkInsertProducts.isPending}
                      />
                      <Button type='submit' disabled={isFetching || bulkInsertProducts.isPending}>
                        Find Products
                      </Button>
                    </Group>
                  </Stack>
                  
                  
                </form>
              </Stack>
              <Divider color='gray.4'/>
              { 
                isFetching ? 
                
                <Center py='100'>
                  <Loader />
                </Center>
                
                : isError ?
                
                <Text ta='center' size='sm' c='red' py='100'>
                  {error instanceof Error ? error.message : "Failed to fetch research products"}
                </Text> 
                
                : !products ?
                
                <Text ta='center' size='sm' c='dimmed' py='100'>
                  Once you submit your ORCID iD, your research products will appear here
                </Text>
                
                : products.length === 0 ?
                
                <Text ta='center' size='sm' c='dimmed' py='100'>
                  No research products found for this ORCID iD. Are you sure it is correct?
                </Text>
                
                : 
                
                <Stack>
                  <Text size="sm" c="dimmed">
                    {products.length} research products found ·{" "}
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
                      .map(([type, works]) => {
                        const selectedInGroup = works.filter((d) => selected.has(d)).length
                        const allOfGroup = selectedInGroup === works.length;

                        return (
                          <Chip 
                            key={type}
                            checked={allOfGroup}
                            onChange={() => toggleGroup(type)}
                            color="var(--ls-accent)"
                            size='xs'
                          >
                            {PRODUCT_TYPE_LABELS[type]} ({selectedInGroup}/{works.length})
                          </Chip>
                        )
                      })
                    }
                    </Group>
                  </Chip.Group>
                  <Pagination radius='sm' total={chunkedProducts!.length} value={activePage} onChange={setPage}/>
                  <SimpleGrid cols={2}>
                  {
                    chunkedProducts[activePage - 1]?.map((product) => 
                      <LSProductReviewItem 
                        key={product.workId} 
                        product={product} 
                        selected={selected.has(product.workId)} 
                        onSelectChange={(checked) => toggleSelected(product.workId, checked)}
                      />
                    )
                  }
                  </SimpleGrid>
                  <Pagination radius='sm' total={chunkedProducts!.length} value={activePage} onChange={setPage}/>
                </Stack>
              }
              {
                products && 
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
                  <Button onClick={handleImportProducts} disabled={bulkInsertProducts.isPending}>
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