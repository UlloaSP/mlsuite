import { useInfiniteCatalog, type CatalogPage } from "@/shared/api/infinite-catalog";
import type { OrganizationDto } from "@/shared/api/openapi.gen";
/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { queryOptions, useQuery } from "@tanstack/react-query";
import { appFetch } from "@/shared/api/http";
import type { WorkspaceCurrentContextDto, WorkspacePermissionsDto } from "@/shared/api/openapi.gen";

export type WorkspacePermissionKey = keyof WorkspacePermissionsDto;

export const WORKSPACE_CONTEXT_QUERY_KEY = ["workspaceContext"] as const;

export const workspaceContextQueryOptions = () =>
  queryOptions({
    queryKey: WORKSPACE_CONTEXT_QUERY_KEY,
    queryFn: ({ signal }) =>
      appFetch<WorkspaceCurrentContextDto>("/api/workspace/context/current", { signal }),
    staleTime: 60_000,
  });

export const useWorkspaceContext = (enabled = true) =>
  useQuery({ ...workspaceContextQueryOptions(), enabled });

export const useCurrentOrganizationId = (): number | undefined =>
  useWorkspaceContext().data?.currentOrganization.id;

export const useCan = (permission: WorkspacePermissionKey): boolean =>
  Boolean(useWorkspaceContext().data?.permissions[permission]);

export function useWorkspaceOrganizationCatalog(search: string) {
  return useInfiniteCatalog({
    queryKey: [...WORKSPACE_CONTEXT_QUERY_KEY, "organizations", "infinite", search],
    queryFn: (page, signal) =>
      appFetch<CatalogPage<OrganizationDto>>(
        `/api/workspace/context/organizations/catalog?${new URLSearchParams({ page: String(page), size: "24", search })}`,
        { signal },
      ),
  });
}
