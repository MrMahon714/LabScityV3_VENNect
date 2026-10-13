import { setSavedPublication } from "@/lib/actions/bookmarks";
import { addPublicationByDoi, bulkInsertPublications, deletePublication, setFeaturedPublication, updatePublication } from "@/lib/actions/publication";
import { bookmarkKeys, publicationKeys } from "@/lib/query-keys";
import { ApiResponse } from "@/lib/types/api";
import { SavedItemsData } from "@/lib/types/bookmarks";
import { InfinitePublications, ParsedOpenAlexWork, PubFilters, PublicationFacets } from "@/lib/types/publication";
import { UpdatePublicationValues } from "@/lib/validations/publication";
import { notifications } from "@mantine/notifications";
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function usePublications(userId: string, filters: PubFilters) {
  return useInfiniteQuery({
    queryKey: publicationKeys.list(userId, filters),
    initialPageParam: null as { date_published: string | null, publication_id: number } | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ userId });
      if(filters.search) params.set('search', filters.search);
      if(filters.year) params.set('year', filters.year);
      if(filters.tagId) params.set('tagId', filters.tagId);
      if(filters.type) params.set('type', filters.type);
      if(filters.sort) params.set('sort', filters.sort);

      if(pageParam) {
        params.set("cursor", btoa(JSON.stringify(pageParam)));  
      }
      const res = await fetch(`/api/publications?${params}`);
      if(!res.ok) throw new Error("Failed to fetch publications");
      const apiResponse: ApiResponse<InfinitePublications> = await res.json();
      if(!apiResponse.success) throw new Error(apiResponse.error)
      return apiResponse.data;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData
  })
}

export function useAddPubByDoi ({
  userId,
  onSuccess,
}: {
  userId: string,
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (doi: string) => {
      const res = await addPublicationByDoi(doi);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onError: (error, _doi, context) => {
      notifications.show({
        color: "red",
        title: "Error adding publication",
        message: error.message
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: publicationKeys.list(userId) })
      queryClient.invalidateQueries({ queryKey: publicationKeys.facets(userId) });
    },

    onSuccess: () => {
      onSuccess?.();
      notifications.show({color: 'green', message: 'Publication Added!'});
    }
  })
}

export function useBulkInsertPublications({
  userId, 
  onSuccess,
}: {
  userId: string,
  onSuccess: () => void
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ publications, orcid }: { publications: ParsedOpenAlexWork[]; orcid?: string }) => {
      const res = await bulkInsertPublications(publications, orcid);
      if(!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      onSuccess?.();
      notifications.show({
          color: 'green', 
          message: `${data!.inserted} pubs inserted, ${data!.skipped} skipped`
      });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "Error bulk importing publications",
        message: error.message
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: publicationKeys.list(userId) });
      queryClient.invalidateQueries({ queryKey: publicationKeys.facets(userId) });
    }
  })
}

export function useDeletePublication(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (publicationId: number) => {
      const res = await deletePublication(publicationId); 
      if(!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: publicationKeys.list(userId) });
      queryClient.invalidateQueries({ queryKey: publicationKeys.facets(userId) });
      notifications.show({color: 'green', message: 'Publication successfully deleted!'})
    },
    onError: (err) => {
      notifications.show({
        color: 'red',
        title: 'Couldn\'t delete publication',
        message: err.message
      });
    }
  })
}

export function useSetFeaturedPublication(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      { publicationId, isFeatured }
      :
      { publicationId: number, isFeatured: boolean }) => {
      const res = await setFeaturedPublication(publicationId, isFeatured);
      if(!res.success) throw new Error(res.error);
      return res.success;
    },
    onSuccess: (_data, {publicationId, isFeatured}) => {
      notifications.show({color: 'green', message: `Publication ${isFeatured ? 'pinned' : 'unpinned'}!`});
    },
    onError: (error, _vars, context) => {
      notifications.show({
        color: "red",
        title: "Error pinning publication",
        message: error.message
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: publicationKeys.list(userId) });
    }
  });
}

export function useGetPublicationFacets(userId: string) {
  return useQuery({
    queryKey: publicationKeys.facets(userId),
    queryFn: async () => {
      const res = await fetch(`/api/publications/facets?userId=${userId}`);
      if(!res.ok) throw new Error('Failed to fetch publication facets');
      const apiResponse: ApiResponse<PublicationFacets> = await res.json();
      if(!apiResponse.success) throw new Error(apiResponse.error);
      return apiResponse.data;
    }
  })
}

export function useSetSavedPublication(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ publicationId, isSaved }: { publicationId: number, isSaved: boolean}) => {
      const res = await setSavedPublication(publicationId, isSaved);
      if(!res.success) throw new Error(res.error);
      return res.success;
    },
    onMutate: async ({ publicationId, isSaved }) => {
      await queryClient.cancelQueries({ queryKey: publicationKeys.all });
      await queryClient.cancelQueries({ queryKey: bookmarkKeys.all });
      const snapshot = [
        ...queryClient.getQueriesData({ queryKey: publicationKeys.all }),
        ...queryClient.getQueriesData({ queryKey: bookmarkKeys.all })
      ];

      queryClient.setQueriesData({ queryKey: publicationKeys.lists() }, (old) => {
        const data = old as { pages?: InfinitePublications[]; pageParams?: any } | undefined;
        if(!data?.pages) return old;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            publications: page.publications.map((pub) => 
              String(pub.publication_id) === String(publicationId) ? { ...pub, isSaved} : pub,
            ),
          })),
        }
      });

      queryClient.setQueriesData({ queryKey: bookmarkKeys.all }, (old) => {
        const data = old as SavedItemsData | undefined;
        if(!Array.isArray(data?.publications)) return old;
        return {
          ...data,
          publications: data.publications.map(row => 
            String(row.publication_id) === String(publicationId) 
            ? 
            { ...row, publications: { ...row.publications, isSaved } }
            : row,
          ),
        }
      });

      return { snapshot };
    },
    onSuccess: (_data, { publicationId, isSaved}) => {
      if(!isSaved) {
        queryClient.setQueriesData({ queryKey: bookmarkKeys.list(userId) }, (old) => {
          const data = old as SavedItemsData | undefined;
          if(!Array.isArray(data?.publications)) return old;
          return { ...data, publications: data.publications.filter(pub => pub.publication_id !== publicationId) }
        });
      }
      notifications.show({color: 'green', message: `Publication ${isSaved ? 'saved' : 'unsaved'}!`});
    },
    onError: (error, _vars, context) => {
      if(context?.snapshot) {
        for (const [key, data] of context.snapshot) {
          queryClient.setQueryData(key, data);
        }
      }
      notifications.show({ color: "red", title: "Error saving publication", message: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
    }
  })
}

export function useUpdatePublication({
  userId, onSuccess,
}: { userId: string, onSuccess: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ publication_id, updates }:
      { publication_id: number, updates: UpdatePublicationValues }) => {
      const res = await updatePublication(publication_id, updates);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      onSuccess?.();
      notifications.show({ color: 'green', message: 'Publication updated!' });
    },
    onError: (error) => {
      notifications.show({ color: 'red', title: 'Error updating publication', message: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: publicationKeys.list(userId) });
      queryClient.invalidateQueries({ queryKey: publicationKeys.facets(userId) });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.list(userId) });
    },
  });
}