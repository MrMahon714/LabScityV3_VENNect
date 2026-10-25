import { 
  ActionIcon,
  Anchor,
  Avatar,
  Badge, 
  Box, 
  Button, 
  Card, 
  Divider, 
  Group, 
  Menu, 
  Modal, 
  Popover, 
  Stack, 
  Text,
  Tooltip,
  UnstyledButton, 
} from "@mantine/core"
import { 
  IconBook, 
  IconBookmark, 
  IconChevronRight,  
  IconDots, 
  IconEdit, 
  IconExternalLink, 
  IconLink, 
  IconPdf, 
  IconPin, 
  IconPinFilled, 
  IconStarFilled, 
  IconTrash,
} from "@tabler/icons-react"
import { MAX_FEATURED_PUBLICATIONS } from "@/lib/constants/publications"
import { Fragment } from "react/jsx-runtime"
// import NextLink from 'next/link';
import classes from './ls-publications.module.css';
import { Publication } from "@/lib/types/data";
import { useDisclosure } from "@mantine/hooks";
import { OPENALEX_WORK_TYPE_LABELS, PUB_PRODUCT_TYPE_ICON_PROPS, PUB_PRODUCT_TYPE_ICONS } from "@/lib/constants/openalex";

const ICON_SIZE = "0.85rem";

interface LSPublicationProps { 
  pub: Publication, 
  isOwner: boolean, 
  onDeleteClick?: () => void, 
  isDeleting?: boolean,
  onFeaturedClick?: () => void,
  featureBtnDisabled?: boolean,
  onSaveClick?: () => void,
  onEditClick?: () => void
} 

export default function LSPublication(
  { 
    pub, 
    isOwner, 
    onDeleteClick, 
    isDeleting, 
    onFeaturedClick,
    featureBtnDisabled,
    onSaveClick,
    onEditClick
  }: LSPublicationProps
) {
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  const typeIcon = PUB_PRODUCT_TYPE_ICONS[pub.type ?? 'other'];
  
  const visibleAuthors = (pub?.authors ?? []).slice(0, 3);
  const authorOverflow = (pub?.authors ?? []).length - visibleAuthors.length;

  pub.title === 'test' ? console.log(pub.date_published) : undefined;

  const date = pub.date_published
  ? new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", timeZone: "UTC" }).format(new Date(pub.date_published))
  : undefined;

  const doiUrl = pub.doi ? `https://doi.org/${pub.doi}` : null;

  return (
    <>
    {
      isOwner &&
      <Modal
        opened={confirmOpen}
        onClose={closeConfirm}
        title="Delete publication"
        centered
        closeOnClickOutside={!isDeleting}
        closeOnEscape={!isDeleting}
        withCloseButton={!isDeleting}
      >
        <Text size="sm" mb="md">
          Remove "{pub.title}" from your profile? This can't be undone.
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" onClick={closeConfirm} disabled={isDeleting}>
            Cancel
          </Button>
          <Button color="red" onClick={onDeleteClick} disabled={isDeleting} loading={isDeleting}>
            Delete
          </Button>
        </Group>
      </Modal>
    }
    <Card
      w='100%'
      p='0'
      bdrs='md'
      style={{
        border: pub.is_featured ? '1px solid var(--mantine-color-blue-3)'  : '1px solid var(--mantine-color-gray-3)',
        borderTop: pub.is_featured ? '1px solid var(--mantine-color-blue-3)' : '1px solid var(--mantine-color-gray-3)',
      }}
      shadow={pub.is_featured ? '0 2px 12px 0 rgba(37, 99, 235, 0.08)' : 'xs'}
      bg={pub.is_featured ? 'var(--ls-surface-alt)' : undefined}
    >
      {/* Is Featured? top strip */}
      { pub.is_featured && 
        <Box 
          pt='3'
          style={{
            borderRadius: '12px 12px 0 0',
            background: `
              linear-gradient(90deg, 
              var(--mantine-color-navy-7) 0%, 
              var(--mantine-color-navy-6) 50%,  
              var(--mantine-color-navy-5) 100%)`
          }}
        />
      }
      <Stack 
        bdrs='12 12 0 0' 
        p='21'
      >
        {/* Badges + Pin Icon */}
        <Group justify="space-between" wrap='nowrap'>
          {/* Badges */}
          <Group>
            {
              pub.is_featured &&
              <Badge 
                tt='none' 
                bg='yellow.1' 
                bd='1px solid yellow.4'
                fz='0.75rem'
                fw='600'
                lh='1rem'
                c='orange.9'
                leftSection={<IconStarFilled size={ICON_SIZE} color="var(--mantine-color-yellow-7)"/>}
              >
                Featured
              </Badge>
            }
            <Badge 
              tt='none' 
              bg='indigo.0' 
              c='indigo.9' 
              fw='500'
              fz='0.75rem'
              lh='1rem'
              leftSection={typeIcon}
            >
              {OPENALEX_WORK_TYPE_LABELS[pub.type ?? 'other']}
            </Badge>
            {
              pub.is_oa && 
              <Badge 
                tt='none' 
                bg='indigo.0' 
                c='indigo.9' 
                fw='500'
                fz='0.75rem'
                lh='1rem'
                leftSection={
                  <IconBook {...PUB_PRODUCT_TYPE_ICON_PROPS}/>
                }
              >Open Access</Badge>
            }
            {
              pub.is_oa && pub.pdf_url ? 
              <Badge 
                tt='none' 
                bg='indigo.0' 
                c='indigo.9' 
                fw='500'
                fz='0.75rem'
                lh='1rem'
                leftSection={
                  <IconPdf {...PUB_PRODUCT_TYPE_ICON_PROPS}/>
                }
              >PDF Available</Badge>
              : undefined
            }
          </Group>

          {/* Make Featured */}
          {
            (isOwner && !!onFeaturedClick) &&
            <Tooltip label={`You can feature up to ${MAX_FEATURED_PUBLICATIONS} publications`} disabled={!featureBtnDisabled}> 
              <ActionIcon variant="subtle" onClick={onFeaturedClick} disabled={featureBtnDisabled}>
                {
                  pub.is_featured ?
                  <IconPinFilled stroke='1.25' color='var(--mantine-color-yellow-7)'/>
                  :
                  <IconPin stroke='1.25'/>
                }
              </ActionIcon>
            </Tooltip>
          }
        </Group>
        {/* Title */}
        <Box>
          <Anchor 
            href={doiUrl ?? ''} 
            underline={!doiUrl ? 'never' : undefined} 
            target='_blank'
            rel='noopener noreferrer'
            c="var(--ls-text-strong)" 
            fz='lg' 
            fw='600' 
            lh='1.625rem'
          >
            {pub.title}
          </Anchor>
        </Box>
        
        <Stack gap='6'>
          {/* Avatars + Authors */}
          <Box component="span" fz='sm'>
            <Avatar.Group 
              spacing={8} 
              style={{ display: "inline-flex", verticalAlign: "middle", marginRight: "0.5rem" }}
            >
            {
              visibleAuthors.map((name, i) => {
                const firstName = name.slice(0, name.indexOf(' '));
                const lastName = name.slice(name.lastIndexOf(' ')+1);
                const initials = `${firstName[0]}${lastName[0]}`;

                return (
                  <Avatar 
                    key={`${name}-${i}`} 
                    size="sm" 
                    color="navy.7"
                    bg='navy.7'
                  >
                    {initials}
                  </Avatar>
                );
              })
            }
            </Avatar.Group>
            {
              visibleAuthors.map((name, i) => (
                <Fragment key={`${name}-${i}`}>
                  {i > 0 && " · "}
                  {name}
                  {i === visibleAuthors.length-1 ? " " : undefined}
                </Fragment>
              ))
            }
            {
              authorOverflow > 0 && (
                <Popover shadow='xs'>
                  <Popover.Target>
                    <UnstyledButton className={classes.authorOverflow} component="span" c="dimmed" fz='sm'>
                      {`+${authorOverflow} more`}
                    </UnstyledButton>
                  </Popover.Target>
                  <Popover.Dropdown
                    bdrs='md' 
                    bd='1px solid var(--ls-border)'
                  >
                    <Stack gap='2'>
                      {
                        (pub.authors ?? []).map((name, i) => 
                          <Text key={`${pub.publication_id}-${name}-${i}`} size='sm'>{name}</Text>
                        )
                      }
                    </Stack>
                  </Popover.Dropdown>
                </Popover>
              )
            }
          </Box>

          {/* Journal + Date */}
          <Group gap='0.5rem' fz='sm' c='dimmed'>
            {/* Using custom dot because IconDotFilled has fake padding */}
            <Box 
              component="span"
              w='0.5rem' 
              h='0.5rem' 
              bg="gray.4" 
              style={{ borderRadius: "50%", display: "inline-block" }}
            />
            {pub.journal ?? undefined}
            {pub.journal && date ? ' · ' : undefined }
            {date}
          </Group>

          {/* DOI Link */}
          {
            doiUrl ? 
            <Box>
              <Anchor 
                href={doiUrl ?? ''} 
                target='_blank'
                rel='noopener noreferrer'
                c='indigo.8' 
                size='sm'
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4}}
              >
                <IconLink color='var(--mantine-color-indigo-8)' size='var(--mantine-font-size-sm)'/>
                doi.org/{pub.doi}
              </Anchor>
            </Box>
            : undefined
          }

          {/* Topics */}
          {
            (pub?.tags && pub.tags.length > 0) ?
            <Group gap='xs'>
              {
              pub.tags.map((t, i) =>  {
                return (
                  <Badge
                  key={t.id ?? `${t.name}${i}`}
                  bd={pub.is_featured ? '1px solid indigo.2' : undefined}
                  bg={pub.is_featured ? 'indigo.0' : 'gray.2'}
                  c={pub.is_featured ? 'indigo.9' : 'var(--mantine-color-text)'}
                  fw='500'
                  tt='none'
                  fz='0.75rem'
                >
                  {t.name}
                </Badge>
                )
              }
                )
              }
            </Group>
            : undefined
          }
        </Stack>

        <Divider />
        {/* View + Read PDF Buttons */}
        <Group justify='space-between'>
          <Group>
            <Button 
              bg={pub.is_featured ? 'indigo.7' : 'navy.7'} 
              bdrs='md' 
              leftSection={<IconExternalLink size='1rem'/>}
              className={pub.is_featured ? classes.featuredViewBtn : classes.viewBtn}
              component="a"
              href={doiUrl ?? ''}
              target='_blank'
              rel='noopener noreferrer'
            >
              View
            </Button>
            {
              pub.is_oa && pub.pdf_url 
              ?
              <Button 
                variant='outline'
                color={pub.is_featured ? 'indigo.7' : undefined}
                bdrs='md' 
                rightSection={<IconChevronRight size='1rem'/>}
                component="a"
                href={pub.pdf_url ?? ''}
                target='_blank'
                rel='noopener noreferrer'
              >
                Read PDF
              </Button>
              : undefined 
            }
          </Group>

          <Group gap='xs'>
          {
            !!onSaveClick &&
            <ActionIcon
              variant='subtle'
              size='lg'
              onClick={onSaveClick}
            >
              <IconBookmark size='1.25rem' stroke='1.5' fill={pub.isSaved ? 'currentColor' : 'none'}/>
            </ActionIcon>
          }
          {/* Update Buttons */}
          {
            isOwner &&             
            <Menu position="top-end" shadow="md">
              <Menu.Target>
                <ActionIcon bdrs='md' variant='subtle' size='lg'>
                  <IconDots size='1.25rem' color='var(--ls-text-strong)' />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconEdit size='1rem' />} onClick={onEditClick}>
                  Edit
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size='1rem' />}
                  onClick={openConfirm}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          }
          </Group>
        </Group>
      </Stack>
    </Card>
    </>
  )
}