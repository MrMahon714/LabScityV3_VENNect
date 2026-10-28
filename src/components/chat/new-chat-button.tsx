'use client'

import { useState, useEffect } from 'react'
import { Button, Modal, Title, Stack, TextInput, Center, Loader, Text, Avatar, NavLink } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useDebouncedValue } from '@mantine/hooks'
import { searchForUsers } from '@/lib/actions/data'
import { useCreateChat } from '@/components/chat/use-chat'
import { User } from '@/lib/types/feed'
import { useRouter } from 'next/navigation'

export default function NewChatButton() {
  const [opened, setOpened] = useState(false)
  const [query, setQuery] = useState('')
  const [debounced] = useDebouncedValue(query, 300)
  const [results, setResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const createChatMutation = useCreateChat()
  const router = useRouter()

  useEffect(() => {
    if (!debounced.trim()) { setResults([]); return }
    setSearching(true)
    searchForUsers({ query: debounced }).then((res) => {
      setResults(res.success ? (res.data ?? []) : [])
      setSearching(false)
    })
  }, [debounced])

  const handleClose = () => {
    setOpened(false)
    setQuery('')
    setSelectedUsers([])
  }

  return (
    <>
      <Button
        color="navy.7"
        variant="filled"
        radius="xl"
        leftSection={<IconPlus size="1rem" />}
        onClick={() => setOpened(true)}
      >
        New Chat
      </Button>

      <Modal opened={opened} onClose={handleClose} title={<Title order={4} c="var(--ls-text-strong)">New Conversation</Title>} centered>
        <Stack gap="md">
          <TextInput
            placeholder="Search by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            radius="xl"
            size="md"
          />
          {searching && <Center><Loader size="sm" /></Center>}
          {results.length > 0 && (
            <Stack gap={0}>
              {results.map((user) => {
                const isSelected = selectedUsers.some(u => u.user_id === user.user_id)
                return (
                  <NavLink
                    key={user.user_id}
                    label={<Text fw={600} c="var(--ls-text-strong)">{user.first_name} {user.last_name}</Text>}
                    leftSection={<Avatar radius="xl" size="md" color="navy.7" bg="navy.7" src={user.avatar_url} />}
                    active={isSelected}
                    styles={{ root: { '--nav-active-bg': 'var(--mantine-color-navy-3)' } }}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedUsers(cur => cur.filter(u => u.user_id !== user.user_id))
                      } else {
                        setSelectedUsers(cur => [...cur, user])
                      }
                    }}
                    style={{ borderRadius: 8 }}
                  />
                )
              })}
            </Stack>
          )}
          {query.trim() && !searching && results.length === 0 && (
            <Text size="sm" c="dimmed" ta="center">No users found</Text>
          )}
          <Button
            fullWidth
            color="navy.7"
            variant="filled"
            radius="xl"
            loading={createChatMutation.isPending}
            disabled={selectedUsers.length === 0}
            onClick={() => createChatMutation.mutate(
              selectedUsers.map(u => u.user_id),
              { 
                onSuccess: (result) => {
                  handleClose()
                  if (result.data?.conversation_id) {
                    router.push(`/chat/${result.data.conversation_id}`)
                  }
                }
              }
            )}
          >
            Start Chat
          </Button>
        </Stack>
      </Modal>
    </>
  )
}