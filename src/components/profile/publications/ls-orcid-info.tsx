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
            border: '1px solid var(--ls-border)'
          }
        }}
      >
        <Text fz='xs'>
          An <b>ORCID iD </b> 
          is a unique identifier researchers can use to link all of your 
          research with you. Linking your account with an ORCID iD will
          enable LabScity to automatically fetch data about your 
          work. 
        </Text>
        <Anchor c='navy.6' fz='xs' href='https://info.orcid.org/researchers/' target="_blank" rel="noopener noreferrer">
          Learn more at orcid.org
        </Anchor>
      </Popover.Dropdown>
    </Popover>
  )
}