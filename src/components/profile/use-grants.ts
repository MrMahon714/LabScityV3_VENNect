import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";

export type Grant = {
  id: number;
  user_id: string;
  title: string;
  granting_agency: string;
  program: string | null;
  years_awarded: string | null;
  role: string | null;
  collaborators: string[] | null;
  created_at: string;
};

export type GrantInput = {
  title: string;
  grantingAgency: string;
  program?: string | null;
  yearsAwarded?: string | null;
  role?: string | null;
  collaborators?: string[] | null;
};

export const grantKeys = {
  all: ["grants"] as const,
  mine: () => ["grants", "mine"] as const,
};

async function fetchMyGrants(): Promise<Grant[]> {
  const res = await fetch("/api/profile/grants");
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to load grants");
  return json.grants ?? [];
}

const grantKey = (title: string, agency: string) =>
  `${title.trim().toLowerCase()}|${agency.trim().toLowerCase()}`;

export function useMyGrants(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: grantKeys.mine(),
    queryFn: fetchMyGrants,
    enabled: options?.enabled ?? true,
  });
}

export function useSaveGrants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (grants: GrantInput[]) => {
      const cleaned = grants
        .map((g) => ({
          title: g.title?.trim() ?? "",
          grantingAgency: g.grantingAgency?.trim() ?? "",
          program: g.program?.trim() || null,
          yearsAwarded: g.yearsAwarded?.trim() || null,
          role: g.role?.trim() || null,
          collaborators: (g.collaborators ?? []).map((c) => c.trim()).filter(Boolean),
        }))
        .filter((g) => g.title && g.grantingAgency);

      const existing = await fetchMyGrants();
      const seen = new Set(existing.map((g) => grantKey(g.title, g.granting_agency)));
      const toSave = cleaned.filter((g) => {
        const key = grantKey(g.title, g.grantingAgency);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (toSave.length === 0) {
        return { inserted: 0, skipped: grants.length };
      }

      const res = await fetch("/api/profile/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grants: toSave }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error("Couldn't save your grants. Please try again.");

      const inserted = (json.grants ?? []).length;
      return { inserted, skipped: grants.length - inserted };
    },
    onError: (err) =>
      notifications.show({
        title: "Could not save grants",
        message: err instanceof Error ? err.message : "Something went wrong",
        color: "red",
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: grantKeys.all });
    },
  });
}


//Deletes grants
export function useDeleteGrant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (grantId: number) => {
      const res = await fetch(`/api/profile/grants?id=${grantId}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to delete grant");
      return grantId;
    },
    onSuccess: () => {
      notifications.show({ color: "green", message: "Grant successfully deleted!" });
    },
    onError: (err) =>
      notifications.show({
        title: "Couldn't delete grant",
        message: err instanceof Error ? err.message : "Something went wrong",
        color: "red",
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: grantKeys.all });
    },
  });
}