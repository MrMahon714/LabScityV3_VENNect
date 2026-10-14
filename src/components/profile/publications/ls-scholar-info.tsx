import { Flex, Popover, UnstyledButton, Text, Anchor } from "@mantine/core";
import { IconHelp } from "@tabler/icons-react";

export default function OrcidInfo({
  size = '1.5rem', stroke = 1, color = "var(--mantine-color-dimmed)"
}: {size?: string, stroke?: number, color?: string}) {  
  return (
    <Popover width='200' position='top' shadow='xs'>
      <Popover.Target>
        <UnstyledButton variant='none' bdrs='100'>
          <Flex>
            <IconHelp size={size} stroke={stroke} color={color}/>  
          </Flex>
        </UnstyledButton>  
      </Popover.Target>  
      <Popover.Dropdown 
        bdrs='md' 
        bd='1px solid navy.2'
        styles={{
          arrow: {
            border: '1px solid var(--mantine-color-navy-2)'
          }
        }}
      >
        <Text fz='xs'>
          A <b>Google Scholar</b> profile is a personalized author page that displays your academic publications and tracks your citation metrics. Linking your account with a Google Scholar ID will enable LabScity to automatically fetch and display data about your research impact.
        </Text>
        <Anchor c='navy.6' fz='xs' href='https://scholar.google.com/intl/en/scholar/citations.html' target="_blank" rel="noopener noreferrer">
          Learn more at Google Scholar Profiles
        </Anchor>
      </Popover.Dropdown>
    </Popover>
  )
}