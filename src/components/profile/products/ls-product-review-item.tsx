import {
  Anchor,
  Badge,
  Checkbox,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconLink,
} from "@tabler/icons-react";
import { ParsedOpenAlexWork } from "@/lib/types/publication";
import { OPENALEX_WORK_TYPE_LABELS, PUB_PRODUCT_TYPE_ICONS } from "@/lib/constants/openalex";
import { PRODUCT_TYPE_LABELS, ProductType } from "@/lib/constants/product";

const PUB_DATE_FMT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
});

// const MAX_VISIBLE_TOPICS = 4;

export default function LSProductReviewItem({
  product: pub,
  selected,
  onSelectChange,
}: {
  product: ParsedOpenAlexWork<ProductType>;
  selected: boolean;
  onSelectChange: (checked: boolean) => void;
}) {
  const typeKey = pub.type ?? "other";
  const typeIcon = PUB_PRODUCT_TYPE_ICONS[typeKey];

  const authorLine = (pub.authors ?? []).join(" · ");

  const date = pub.publicationDate
    ? PUB_DATE_FMT.format(new Date(pub.publicationDate))
    : undefined;

  // const topics = pub.topics ?? [];
  // const visibleTopics = topics.slice(0, MAX_VISIBLE_TOPICS);
  // const topicOverflow = topics.length - visibleTopics.length;

  const doiUrl = pub.doi ? `https://doi.org/${pub.doi}` : null;

  return (
    <Checkbox.Card
      radius="md"
      withBorder
      checked={selected}
      onChange={onSelectChange}
      p="sm"
      style={{
        borderColor: selected
          ? "var(--mantine-color-navy-5)"
          : "var(--mantine-color-gray-3)",
        background: selected ? "var(--ls-tint-bg)" : undefined,
      }}
    >
      <Group wrap="nowrap" align="flex-start" gap="sm">
        <Checkbox.Indicator radius='sm' checked={selected} mt={2} color="var(--ls-accent)" />

        <Stack gap={6} style={{ minWidth: 0, flex: 1 }}>
          {/* Type + title */}
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <Badge
              tt="none"
              bg="indigo.0"
              c="indigo.9"
              fw="500"
              fz="0.7rem"
              lh="1rem"
              leftSection={typeIcon}
              style={{ flexShrink: 0 }}
            >
              {PRODUCT_TYPE_LABELS[typeKey]}
            </Badge>
          </Group>

          <Text fz="sm" fw="600" c="var(--ls-text-strong)" lh="1.4rem" lineClamp={2}>
            {pub.title}
          </Text>

          {/* Authors */}
          {authorLine && (
            <Text fz="xs" c="dimmed" lineClamp={1}>
              {authorLine}
            </Text>
          )}

          {/* Journal + date */}
          {(pub.journal || date) && (
            <Text fz="xs" c="dimmed">
              {pub.journal ?? undefined}
              {pub.journal && date ? " · " : undefined}
              {date}
            </Text>
          )}

          {/* DOI */}
          {doiUrl && (
            <Anchor
              href={doiUrl}
              target="_blank"
              rel="noopener noreferrer"
              c="indigo.8"
              fz="xs"
              onClick={(e) => e.stopPropagation()}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, width: "fit-content" }}
            >
              <IconLink size="0.8rem" color="var(--mantine-color-indigo-8)" />
              doi.org/{pub.doi}
            </Anchor>
          )}

          {/* Topics */}
          {/* {visibleTopics.length > 0 && (
            <Group gap="6" mt={2}>
              {visibleTopics.map((topic) => (
                <Badge
                  key={topic}
                  bg="gray.2"
                  c="var(--mantine-color-text)"
                  fw="500"
                  tt="none"
                  fz="0.7rem"
                >
                  {topic}
                </Badge>
              ))}
              {topicOverflow > 0 && (
                <Text fz="xs" c="dimmed">
                  +{topicOverflow} more
                </Text>
              )}
            </Group>
          )} */}
        </Stack>
      </Group>
    </Checkbox.Card>
  );
}