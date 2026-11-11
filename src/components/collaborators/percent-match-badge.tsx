import { Badge, Group, Text } from "@mantine/core";
import { IconStarFilled } from "@tabler/icons-react";

export default function PercentMatchBadge({percentMatch, text}: {percentMatch: number, text?: string}) {
  let similarityColor = 'gray';
  if(percentMatch >= 85)
    similarityColor = 'teal';
  else if(percentMatch >= 60)
    similarityColor = 'blue';

  return (
    <Badge
      variant='light'
      color={similarityColor}
      mt='4px'
      bd={`1px solid color-mix(in srgb, var(--mantine-color-${similarityColor}-light-color) 45%, transparent)`}
      p='2px 6px'
      tt='none'
    >
      <Group wrap='nowrap' gap='2'>
        <IconStarFilled size='12' />
        <Text
          fz='0.625rem'
          fw='600'
          c='inherit'
        >
          {percentMatch}% {text}
        </Text>
      </Group>
    </Badge>
  );
}
