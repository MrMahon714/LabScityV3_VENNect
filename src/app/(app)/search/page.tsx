"use client";

import {
  Avatar,
  Divider,
  Flex,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/use-auth";
import { usePostDetail } from "@/components/feed/use-post-detail";
import { LSSpinner } from "@/components/ui/ls-spinner";
import { searchUserContent } from "@/lib/actions/data";
import type { searchResult } from "@/lib/types/data";
import { FeedPostCard } from "@/components/feed/home-feed";
import { useSetSavedPost } from "@/components/feed/use-feed";
import { usePostActions } from "@/lib/actions/use-post-actions";

const FULL_RESULTS_LIMIT = 50;
type SearchFilter = "all" | "users" | "posts" | "groups";

function SearchSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap="xs">
      <Text size="xs" fw={700} c="gray.5" tt="uppercase">
        {title}
      </Text>
      {children}
    </Stack>
  );
}

function SearchPostResult({
  postId,
  currentUserId,
  onRemove,
}: {
  postId: string;
  currentUserId: string | null;
  onRemove: () => void
}) {
  const router = useRouter();
  const { data, isLoading, isError } = usePostDetail(postId);
  const actions = usePostActions(postId, { onDeleted: onRemove });
  const setSavedPost = useSetSavedPost(currentUserId ?? '');

  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  );

  if (isLoading) {
    return (
      <Paper withBorder radius="md" p="lg">
        <Flex justify="center" py="md">
          <LSSpinner />
        </Flex>
      </Paper>
    );
  }

  if (isError || !data?.success || !data.data) {
    return (
      <Paper withBorder radius="md" p="lg">
        <Text c="red">Failed to load post.</Text>
      </Paper>
    );
  } 

  return (
    <FeedPostCard 
      post={data.data} 
      currentUserId={currentUserId} 
      commentOpen={activeCommentPostId === postId}
      onToggleComments={() =>
        setActiveCommentPostId((c) => (c === postId ? null : postId))
      }
      onAddComment={async (postId, values) => await actions.addComment(values)}
      onLike={() => actions.toggleLike()}
      onDelete={() => actions.remove()}
      onSetSaved={(postId, save) => setSavedPost.mutate({ postId, save })} 
    />
  );
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const query = searchParams.get("q")?.trim() ?? "";

  const [results, setResults] = useState<searchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SearchFilter>("all");

  useEffect(() => {
    if (!query) {
      setResults([]);
      setSearching(false);
      setError(null);
      return;
    }

    let isCancelled = false;

    setSearching(true);
    setError(null);

    searchUserContent({ query, limit: FULL_RESULTS_LIMIT }).then((response) => {
      if (isCancelled) {
        return;
      }

      if (!response.success) {
        setResults([]);
        setError(response.error ?? "Failed to load search results.");
        setSearching(false);
        return;
      }

      setResults(response.data ?? []);
      setSearching(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [query]);

  const groupedResults = useMemo(
    () => ({
      users: results.filter((result) => result.content_type === "user"),
      posts: results.filter((result) => result.content_type === "post"),
      groups: results.filter((result) => result.content_type === "group"),
    }),
    [results],
  );

  const hasResults = results.length > 0;
  const showUsers = filter === "all" || filter === "users";
  const showPosts = filter === "all" || filter === "posts";
  const showGroups = filter === "all" || filter === "groups";
  const visibleResultCount =
    (showUsers ? groupedResults.users.length : 0) +
    (showPosts ? groupedResults.posts.length : 0) +
    (showGroups ? groupedResults.groups.length : 0);

  return (
    <Stack maw={900} mx="auto" px="md" py="xl" gap="lg">
      <Stack gap={4}>
        <Text size="xl" fw={700} c="var(--ls-text-strong)">
          Search
        </Text>
        <Text c="dimmed">
          {query
            ? `Showing results for "${query}"`
            : "Enter a search from the navbar to see results here."}
        </Text>
      </Stack>

      <SegmentedControl
        value={filter}
        onChange={(value) => setFilter(value as SearchFilter)}
        data={[
          { label: "All", value: "all" },
          { label: "Users", value: "users" },
          { label: "Posts", value: "posts" },
          { label: "Groups", value: "groups" },
        ]}
      />

      {searching && (
        <Group justify="center" py="xl">
          <LSSpinner />
        </Group>
      )}

      {!searching && error && (
        <Paper withBorder radius="md" p="lg">
          <Text c="red">{error}</Text>
        </Paper>
      )}

      {!searching && !error && query && !hasResults && (
        <Paper withBorder radius="md" p="lg">
          <Text c="dimmed">No results found.</Text>
        </Paper>
      )}

      {!searching &&
        !error &&
        query &&
        hasResults &&
        visibleResultCount === 0 && (
          <Paper withBorder radius="md" p="lg">
            <Text c="dimmed">No results found for this filter.</Text>
          </Paper>
        )}

      {!searching && !error && hasResults && (
        <Paper withBorder radius="lg" p="lg">
          <Stack gap="lg">
            {showUsers && groupedResults.users.length > 0 && (
              <SearchSection title="Users">
                {groupedResults.users.map((result) => (
                  <UnstyledButton
                    key={`user-${result.id}`}
                    onClick={() => router.push(`/profile/${result.id}`)}
                  >
                    <Group gap="sm" p="sm" style={{ borderRadius: 8 }}>
                      <Avatar radius="xl" color="navy.7" bg="navy.7">
                        {result.names?.[0]}
                      </Avatar>
                      <Stack gap={0}>
                        <Text fw={600} c="var(--ls-text-strong)">
                          {result.names}
                        </Text>
                        <Text size="sm" c="dimmed">
                          User
                        </Text>
                      </Stack>
                    </Group>
                  </UnstyledButton>
                ))}
              </SearchSection>
            )}

            {showPosts && groupedResults.posts.length > 0 && (
              <>
                {showUsers && groupedResults.users.length > 0 && <Divider />}
                <SearchSection title="Posts">
                  {groupedResults.posts.map((result) => (
                    <SearchPostResult
                      key={`post-${result.id}`}
                      postId={result.id}
                      currentUserId={user?.id ?? null}
                      onRemove={() => setResults((prev) => prev.filter((r) => r.id !== result.id))}
                    />
                  ))}
                </SearchSection>
              </>
            )}

            {showGroups && groupedResults.groups.length > 0 && (
              <>
                {((showUsers && groupedResults.users.length > 0) ||
                  (showPosts && groupedResults.posts.length > 0)) && (
                  <Divider />
                )}
                <SearchSection title="Groups">
                  {groupedResults.groups.map((result) => (
                    <UnstyledButton
                      key={`group-${result.id}`}
                      onClick={() => router.push(`/groups/${result.id}`)}
                    >
                      <Paper withBorder radius="md" p="md">
                        <Stack gap={6}>
                          <Text fw={600} c="var(--ls-text-strong)">
                            {result.names}
                          </Text>
                          {result.content && (
                            <Text c="gray.8" style={{ whiteSpace: "pre-wrap" }}>
                              {result.content}
                            </Text>
                          )}
                        </Stack>
                      </Paper>
                    </UnstyledButton>
                  ))}
                </SearchSection>
              </>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
