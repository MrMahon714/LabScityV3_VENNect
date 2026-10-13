"use client";

import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Burger,
  Button,
  Divider,
  Flex,
  Group,
  Menu,
  Modal,
  Paper,
  Stack,
  Switch,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import {
  IconBell,
  IconBellFilled,
  IconBriefcase,
  IconFlaskFilled,
  IconGavel,
  IconLogout,
  IconMessageCircle,
  IconSearch,
  IconSettings,
  IconSettingsFilled,
  IconUser,
  IconUsers,
  IconUsersGroup,
  IconX,
} from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSetNotificationPreference } from "@/components/notifications/use-notifications";
import { LSSpinner } from "@/components/ui/ls-spinner";
import { getUser, searchUserContent } from "@/lib/actions/data";
import type { searchResult } from "@/lib/types/data";
import { useNotificationStore } from "@/store/notificationStore";
import { createClient } from "@/supabase/client";
import { useIsMobile } from "../use-is-mobile";
import { useGetUser } from "@/components/data/use-data";
import classes from './app-topbar.module.css';
import { initials } from "@/components/feed/post-detail-card.utils";
import { parsePostContent } from "@/lib/utils/post-content";
import { LSThemeToggle } from "@/components/ui/ls-theme-toggle";

type NotificationType =
  | "post_like"
  | "new_comment"
  | "new_message"
  | "group_invite";
type NotificationPreferenceMap = Record<NotificationType, boolean>;

const defaultNotificationPreferences: NotificationPreferenceMap = {
  post_like: true,
  new_comment: true,
  new_message: true,
  group_invite: true,
};

const notificationOptions: Array<{ key: NotificationType; label: string }> = [
  { key: "post_like", label: "Likes" },
  { key: "new_comment", label: "Comments" },
  { key: "new_message", label: "Messages" },
  { key: "group_invite", label: "Group Invites" },
];

const searchStyles = {
  input: {
    background: "var(--ls-search-bg)",
    "--input-bd": "var(--ls-search-border)",
    "--input-bd-focus": "var(--ls-search-focus)",
  },
};

const LAST_VISITED_NOTIFICATIONS_KEY = "labscity:last-visited-notifications-at";

interface LSAppTopBarProps {
  userId: string;
  isModerator: boolean;
}

const baseNavigation = [
  { href: "/home", icon: IconFlaskFilled, label: "Home" },
  { href: "/jobs", icon: IconBriefcase, label: "Jobs" },
  { href: "/groups", icon: IconUsersGroup, label: "Groups" },
  { href: "/chat", icon: IconMessageCircle, label: "Messages" },
];

const moderatorNavItem = {
  href: "/moderation",
  icon: IconGavel,
  label: "Moderation",
};

export default function LSAppTopBar({ userId, isModerator }: LSAppTopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, mobileMenu] = useDisclosure(false);

  const navigation = isModerator
    ? [...baseNavigation, moderatorNavItem]
    : baseNavigation;
  const inNotificationsPage = pathname.startsWith("/notifications");
  const notifications = useNotificationStore((state) => state.notifications);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [savingPreference, setSavingPreference] =
    useState<NotificationType | null>(null);
  const [lastVisitedNotificationsAtMs, setLastVisitedNotificationsAtMs] =
    useState<number | null>(null);
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferenceMap>(defaultNotificationPreferences);
  const setPreferenceMutation = useSetNotificationPreference();

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced] = useDebouncedValue(query, 300);
  const [results, setResults] = useState<searchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useGetUser(userId);

  useEffect(() => {
    const rawValue = window.localStorage.getItem(
      LAST_VISITED_NOTIFICATIONS_KEY,
    );
    const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : Number.NaN;
    setLastVisitedNotificationsAtMs(
      Number.isFinite(parsedValue) ? parsedValue : null,
    );
  }, []);

  useEffect(() => {
    if (!inNotificationsPage) return;

    const now = Date.now();
    window.localStorage.setItem(LAST_VISITED_NOTIFICATIONS_KEY, String(now));
    setLastVisitedNotificationsAtMs(now);
  }, [inNotificationsPage]);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);
    searchUserContent({ query: debounced }).then((res) => {
      setResults(res.success ? (res.data ?? []) : []);
      setSearching(false);
    });
  }, [debounced]);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!optionsOpen) return;

      setIsLoadingOptions(true);
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        setIsLoadingOptions(false);
        return;
      }

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("notification_type, is_enabled")
        .eq("user_id", authData.user.id)
        .in("notification_type", [
          "post_like",
          "new_comment",
          "new_message",
          "group_invite",
        ]);

      if (!error && data) {
        const nextPreferences = { ...defaultNotificationPreferences };
        for (const preference of data) {
          const notificationType =
            preference.notification_type as NotificationType;
          if (notificationType in nextPreferences) {
            nextPreferences[notificationType] = preference.is_enabled;
          }
        }
        setNotificationPreferences(nextPreferences);
      }

      setIsLoadingOptions(false);
    };

    void loadPreferences();
  }, [optionsOpen]);

  const newNotificationsCount = notifications.reduce((count, notification) => {
    if (lastVisitedNotificationsAtMs === null) return count + 1;

    const createdAtMs = Date.parse(notification.created_at);
    if (!Number.isFinite(createdAtMs)) return count;

    return createdAtMs > lastVisitedNotificationsAtMs ? count + 1 : count;
  }, 0);
  const hasNewNotifications = newNotificationsCount > 0;
  const displayedNewNotificationsCount =
    newNotificationsCount > 99 ? "99+" : String(newNotificationsCount);

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
    setResults([]);
  };

  const submitSearch = () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    closeSearch();
  };

  const updateNotificationPreference = async (
    notificationType: NotificationType,
    newValue: boolean,
  ) => {
    setNotificationPreferences((current) => ({
      ...current,
      [notificationType]: newValue,
    }));
    setSavingPreference(notificationType);
    try {
      await setPreferenceMutation.mutateAsync({
        newValue,
        notificationType,
      });
    } finally {
      setSavingPreference(null);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const getHref = (href: string) =>
    href === "/profile" ? `/profile/${userId}` : href;
  const isActive = (href: string) =>
    href === "/home"
      ? pathname === "/home"
      : pathname === href || pathname.startsWith(`${href}/`);

  const groupedUsers = results.filter((r) => r.content_type === "user");
  const groupedPosts = results.filter((r) => r.content_type === "post");
  const groupedGroups = results.filter((r) => r.content_type === "group");
  const showDropdown = searchOpen && query.trim().length > 0;

  const navItems = [
    ...navigation,
    { href: "/profile", icon: IconUser, label: "Profile" },
  ];

  return (
    <>
      <Box
        component="header"
        pos="sticky"
        top={0}
        bg="var(--ls-topbar)"
        style={{
          borderBottom: "1px solid var(--ls-topbar-border)",
          boxShadow: "var(--ls-topbar-shadow)",
          backdropFilter: "blur(18px)",
          zIndex: 30,
        }}
      >
        <Flex h={56} align="center" px={{ base: "sm", md: "lg" }} gap="md">
          <UnstyledButton
            component={Link}
            href="/home"
            aria-label="LabScity home"
            style={{ display: "flex", alignItems: "center" }}
          >
            <Image
              src="/logo-lightgray.png"
              width={500}
              height={60}
              style={{ width: "auto", height: 34 }}
              alt="LabScity"
              priority
            />
          </UnstyledButton>

          {!isMobile && (
            <Box pos="relative" flex={1} maw={560}>
              <TextInput
                ref={inputRef}
                value={query}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => setQuery(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitSearch();
                  }
                }}
                leftSection={<IconSearch size={16} />}
                placeholder="Search people, publications, posts, groups..."
                radius="md"
                styles={searchStyles}
              />
              {showDropdown && (
                <SearchResultsDropdown
                  searching={searching}
                  groupedUsers={groupedUsers}
                  groupedPosts={groupedPosts}
                  groupedGroups={groupedGroups}
                  closeSearch={closeSearch}
                />
              )}
            </Box>
          )}

          {!isMobile && (
            <Group gap={0} ml="auto" h='100%'>
              {navItems.map((item) => {
                const active = isActive(item.href);
                const href = getHref(item.href);

                return (
                  <Button
                    key={item.href}
                    component={Link}
                    href={href}
                    radius="0"
                    variant="transparent"
                    size="compact-sm"
                    leftSection={<item.icon size={18} />}
                    fw={active ? 700 : 500}
                    c={active ? "white" : "#C1C9D1"}
                    styles={{
                      root: {
                        backgroundColor: active
                          ? "rgba(255,255,255,0.12)"
                          : undefined,
                        borderBottom: active
                          ? "2px solid var(--mantine-color-navy-2)"
                          : "2px solid transparent",
                      },
                    }}
                    h='100%'
                    className={classes.navItems}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Group>
          )}

          <Group gap={4} ml={isMobile ? "auto" : 4}>
            {isMobile && (
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => {
                  setSearchOpen(true);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                aria-label="Search"
              >
                <IconSearch size={20} />
              </ActionIcon>
            )}

            <LSThemeToggle />

            <ActionIcon
              component={Link}
              href="/notifications"
              variant="subtle"
              color={
                hasNewNotifications
                  ? "indigo.4"
                  : inNotificationsPage
                    ? "white"
                    : "#C1C9D1"
              }
              radius={100}
              className={classes.navItems}
              styles={{ root: { overflow: "visible" } }}
            >
              <Box pos="relative" style={{ display: "inline-flex" }}>
                {inNotificationsPage ? (
                  <IconBellFilled size={20} />
                ) : (
                  <IconBell size={20} />
                )}
                {hasNewNotifications && (
                  <Badge
                    size="xs"
                    color="indigo.4"
                    variant="filled"
                    pos="absolute"
                    top={-8}
                    right={-10}
                    px={4}
                  >
                    {displayedNewNotificationsCount}
                  </Badge>
                )}
              </Box>
            </ActionIcon>

            <Menu opened={settingsOpen} onChange={setSettingsOpen}>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color={settingsOpen ? "white" : "#C1C9D1"}
                  aria-label="Settings"
                  radius="100"
                  className={classes.navItems}
                >
                  {settingsOpen ? (
                    <IconSettingsFilled size={20} />
                  ) : (
                    <IconSettings size={20} />
                  )}
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  onClick={() => {
                    setOptionsOpen(true);
                    setSettingsOpen(false);
                  }}
                >
                  Options
                </Menu.Item>
                <Menu.Item
                  c="red"
                  leftSection={<IconLogout size={14} />}
                  onClick={handleSignOut}
                >
                  Sign Out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>

            {!isMobile && (
              <UnstyledButton component={Link} href={`/profile/${userId}`}>
                <Avatar size={34} radius="xl" bg="var(--ls-navy-tint)" color="navy.6" src={profile?.avatar_url}>
                  {initials([profile?.first_name, profile?.last_name].filter(Boolean).join(" "))}
                </Avatar> 
              </UnstyledButton>
            )}

            {isMobile && (
              <Burger
                opened={mobileMenuOpen}
                onClick={mobileMenu.toggle}
                size="sm"
                color="var(--mantine-color-gray-6)"
              />
            )}
          </Group>
        </Flex>

        {isMobile && searchOpen && (
          <Box px="sm" pb="sm" pos="relative">
            <TextInput
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitSearch();
                }
              }}
              leftSection={<IconSearch size={16} />}
              rightSection={
                <ActionIcon variant="transparent" onClick={closeSearch}>
                  <IconX size={16} />
                </ActionIcon>
              }
              placeholder="Search LabScity..."
              radius="md"
              styles={searchStyles}
            />
            {showDropdown && (
              <SearchResultsDropdown
                searching={searching}
                groupedUsers={groupedUsers}
                groupedPosts={groupedPosts}
                groupedGroups={groupedGroups}
                closeSearch={closeSearch}
              />
            )}
          </Box>
        )}

        {isMobile && mobileMenuOpen && (
          <Stack gap={4} px="sm" pb="sm">
            {navItems.map((item) => (
              <Button
                key={item.href}
                component={Link}
                href={getHref(item.href)}
                variant={isActive(item.href) ? "light" : "subtle"}
                color={isActive(item.href) ? "navy" : "gray"}
                leftSection={<item.icon size={18} />}
                justify="flex-start"
                onClick={mobileMenu.close}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
        )}
      </Box>

      <Modal
        opened={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        title="Notification Options"
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Choose which notifications you want to receive.
          </Text>
          {notificationOptions.map((option) => (
            <Switch
              key={option.key}
              label={option.label}
              checked={notificationPreferences[option.key]}
              disabled={isLoadingOptions || savingPreference === option.key}
              onChange={(event) =>
                void updateNotificationPreference(
                  option.key,
                  event.currentTarget.checked,
                )
              }
            />
          ))}
        </Stack>
      </Modal>
    </>
  );
}

function SearchResultsDropdown({
  searching,
  groupedUsers,
  groupedPosts,
  groupedGroups,
  closeSearch,
}: {
  searching: boolean;
  groupedUsers: searchResult[];
  groupedPosts: searchResult[];
  groupedGroups: searchResult[];
  closeSearch: () => void;
}) {
  const router = useRouter();
  const hasResults =
    groupedUsers.length > 0 ||
    groupedPosts.length > 0 ||
    groupedGroups.length > 0;

  const goTo = (href: string) => {
    router.push(href);
    closeSearch();
  };

  return (
    <Paper
      pos="absolute"
      top="calc(100% + 8px)"
      left={0}
      right={0}
      shadow="xl"
      p="sm"
      mah="60vh"
      style={{ zIndex: 40, overflowY: "auto" }}
    >
      {searching && (
        <Flex justify="center" py="sm">
          <LSSpinner />
        </Flex>
      )}

      {!searching && !hasResults && (
        <Text size="sm" c="dimmed" ta="center" py="sm">
          No results
        </Text>
      )}

      {!searching && groupedUsers.length > 0 && (
        <ResultGroup
          title="Users"
          rows={groupedUsers}
          getHref={(row) => `/profile/${row.id}`}
          onSelect={goTo}
        />
      )}
      {!searching && groupedPosts.length > 0 && (
        <>
          {groupedUsers.length > 0 && <Divider my="xs" />}
          <ResultGroup
            title="Posts"
            rows={groupedPosts}
            getHref={(row) => `/posts/${row.id}`}
            onSelect={goTo}
          />
        </>
      )}
      {!searching && groupedGroups.length > 0 && (
        <>
          {(groupedUsers.length > 0 || groupedPosts.length > 0) && (
            <Divider my="xs" />
          )}
          <ResultGroup
            title="Groups"
            rows={groupedGroups}
            getHref={(row) => `/groups/${row.id}`}
            onSelect={goTo}
          />
        </>
      )}
    </Paper>
  );
}

function ResultGroup({
  title,
  rows,
  getHref,
  onSelect,
}: {
  title: string;
  rows: searchResult[];
  getHref: (row: searchResult) => string;
  onSelect: (href: string) => void;
}) {  
  return (
    <Stack gap={2}>
      <Text size="xs" fw={700} c="gray.5" tt="uppercase" px={6}>
        {title}
      </Text>
      {
        rows.map((row) => { 
          const postTitle = parsePostContent(row.content).title;
          return (
            <UnstyledButton
              key={`${title}-${row.id}`}
              w="100%"
              px="xs"
              py={6}
              style={{ borderRadius: 6 }}
              onClick={() => onSelect(getHref(row))}
            >
              <Group gap="sm" wrap="nowrap">
                <Avatar size="sm" radius="xl" color="navy.7">
                  {(row.names || postTitle|| title).slice(0, 1)}
                </Avatar>
                <Box miw={0}>
                  <Text size="sm" fw={500} c="var(--ls-text-strong)" truncate>
                    {row.names || postTitle}
                  </Text>
                  {postTitle && row.names && (
                    <Text size="xs" c="dimmed" truncate>
                      {postTitle}
                    </Text>
                  )}
                </Box>
              </Group>
            </UnstyledButton>
          )
        })
      }
    </Stack>
  );
}
