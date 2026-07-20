/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { QueryClient } from "@tanstack/react-query";
import { invalidatePluginRuntimeCache } from "@/capabilities/mlform/plugin-runtime-cache";
import { organizationQueryKey } from "@/capabilities/workspace-context/organization-query-key";

export const removeOrganizationCache = async (
  queryClient: QueryClient,
  organizationId: number,
): Promise<void> => {
  const scope = organizationQueryKey(organizationId);
  await queryClient.cancelQueries({ queryKey: scope });
  queryClient.removeQueries({ queryKey: scope });
  invalidatePluginRuntimeCache(organizationId);
};
