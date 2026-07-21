/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidatePluginRuntimeCache } from "@/capabilities/mlform/plugin-runtime-cache";
import { PLUGIN_RUNTIME_SOURCES_QUERY_KEY } from "@/capabilities/mlform/plugin-runtime-sources";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { deletePlugin, uploadPlugin } from "./plugin.api";
import { PLUGIN_CATALOG_PAGE_QUERY_KEY, PLUGIN_CATALOG_STATS_QUERY_KEY } from "./plugin.keys";

export const useInvalidatePluginQueries = () => {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return async () => {
    invalidatePluginRuntimeCache(organizationId);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: PLUGIN_CATALOG_PAGE_QUERY_KEY(organizationId) }),
      queryClient.invalidateQueries({ queryKey: PLUGIN_CATALOG_STATS_QUERY_KEY(organizationId) }),
      queryClient.invalidateQueries({ queryKey: PLUGIN_RUNTIME_SOURCES_QUERY_KEY(organizationId) }),
    ]);
  };
};

export const useUploadPluginMutation = () => {
  const invalidate = useInvalidatePluginQueries();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: uploadPlugin,
    onSuccess: invalidate,
  });
};

export const useDeletePluginMutation = () => {
  const invalidate = useInvalidatePluginQueries();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: deletePlugin,
    onSuccess: invalidate,
  });
};
