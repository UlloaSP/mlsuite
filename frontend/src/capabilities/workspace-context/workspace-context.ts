import { useInfiniteCatalog, type CatalogPage } from "@/shared/api/infinite-catalog";
import type { OrganizationDto } from "@/shared/api/openapi.gen";
/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { queryOptions, useQuery } from "@tanstack/react-query";
import { actInOrganization, appFetch, isHttpError, tabOrganization } from "@/shared/api/http";
import type { WorkspaceCurrentContextDto, WorkspacePermissionsDto } from "@/shared/api/openapi.gen";

export type WorkspacePermissionKey = keyof WorkspacePermissionsDto;

export const WORKSPACE_CONTEXT_QUERY_KEY = ["workspaceContext"] as const;

const fetchContext = (signal: AbortSignal) =>
  appFetch<WorkspaceCurrentContextDto>("/api/workspace/context/current", { signal });

/**
 * The organization this tab works in, which every request then names. A tab opens on the one the
 * account last selected; a tab whose organization the member no longer belongs to (or that is
 * gone) returns to it as well.
 */
export const workspaceContextQueryOptions = () =>
  queryOptions({
    queryKey: WORKSPACE_CONTEXT_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const context = await fetchContext(signal).catch((error: unknown) => {
        if (tabOrganization() === null || !isHttpError(error) || ![403, 404].includes(error.status))
          throw error;
        actInOrganization(null);
        return fetchContext(signal);
      });
      actInOrganization(context.currentOrganization.id);
      return context;
    },
    staleTime: 60_000,
    // ProtectedRoute shows a failure, so one failure gets one visible owner.
    meta: { errorHandledLocally: true },
  });

export const useWorkspaceContext = (enabled = true) =>
  useQuery({ ...workspaceContextQueryOptions(), enabled });

export const useCurrentOrganizationId = (): number | undefined =>
  useWorkspaceContext().data?.currentOrganization.id;

export const useCan = (permission: WorkspacePermissionKey): boolean =>
  Boolean(useWorkspaceContext().data?.permissions[permission]);

/** Where the member may switch to, their personal account first; "team" leaves only organizations. */
export function useWorkspaceOrganizationCatalog(search: string, filter: "all" | "team" = "all") {
  return useInfiniteCatalog({
    queryKey: [...WORKSPACE_CONTEXT_QUERY_KEY, "organizations", "infinite", search, filter],
    queryFn: (page, signal) =>
      appFetch<CatalogPage<OrganizationDto>>(
        `/api/workspace/context/organizations/catalog?${new URLSearchParams({ page: String(page), size: "24", search, filter })}`,
        { signal },
      ),
  });
}
