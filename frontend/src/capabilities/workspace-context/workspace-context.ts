/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { queryOptions, useQuery } from "@tanstack/react-query";
import { appFetch } from "@/shared/api/http";
import type { WorkspaceContextDto, WorkspacePermissionsDto } from "@/shared/api/openapi.gen";

export type WorkspacePermissionKey = keyof WorkspacePermissionsDto;

export const WORKSPACE_CONTEXT_QUERY_KEY = ["workspaceContext"] as const;

export const workspaceContextQueryOptions = () =>
  queryOptions({
    queryKey: WORKSPACE_CONTEXT_QUERY_KEY,
    queryFn: ({ signal }) => appFetch<WorkspaceContextDto>("/api/workspace/context", { signal }),
    staleTime: 60_000,
  });

export const useWorkspaceContext = (enabled = true) =>
  useQuery({ ...workspaceContextQueryOptions(), enabled });

export const useCurrentOrganizationId = (): number | undefined =>
  useWorkspaceContext().data?.currentOrganization.id;

export const useCan = (permission: WorkspacePermissionKey): boolean =>
  Boolean(useWorkspaceContext().data?.permissions[permission]);
