"use client";

import { Box } from "@mantine/core";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { getGroups, searchPublicGroups } from "@/lib/actions/groups";
import { LSDiscoverGroupsPanel } from "./ls-discover-groups-panel";
import { LSGroupLayout } from "./ls-group-layout";
import type { LSGroupLayoutProps } from "./ls-group-layout.types";

export interface LSGroupsPageShellProps extends LSGroupLayoutProps {
  searchPublicGroupsAction: typeof searchPublicGroups;
  getGroupsAction: typeof getGroups;
}

/**
 * Groups route shell: My groups (existing layout) vs Discover (public search).
 * Tabs are controlled from the URL so client navigations (e.g. join from Discover)
 * can switch to My groups without remounting the route.
 */
export function LSGroupsPageShell({
  searchPublicGroupsAction,
  getGroupsAction,
  ...layoutProps
}: LSGroupsPageShellProps) {
  const searchParams = useSearchParams();

  const view = useMemo(
    () => (searchParams.get("tab") === "discover" ? "discover" : "mine"),
    [searchParams],
  );
  const autoOpenCreateGroup = searchParams.get("action") === "create";

  return (
    <Box mih="calc(100vh - 60px)">
      <LSGroupLayout
        {...layoutProps}
        view={view}
        autoOpenCreateGroup={autoOpenCreateGroup}
        discoverNode={
          <LSDiscoverGroupsPanel
            searchPublicGroupsAction={searchPublicGroupsAction}
            joinGroupAction={layoutProps.joinGroupAction}
            getGroupsAction={getGroupsAction}
          />
        }
      />
    </Box>
  );
}
