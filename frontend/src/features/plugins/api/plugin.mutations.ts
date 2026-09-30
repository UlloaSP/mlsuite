/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidatePluginRuntimeCache } from "@/capabilities/prediction-runtime/plugins/plugin-runtime-cache";
import { PLUGIN_RUNTIME_SOURCES_QUERY_KEY } from "@/capabilities/prediction-runtime/plugins/plugin-runtime-sources";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { deletePlugin, uploadPlugin } from "./plugin.api";
import { pluginCatalogKeys } from "./plugin.keys";

const useInvalidatePluginQueries = () => {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return async () => {
    invalidatePluginRuntimeCache(organizationId);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: pluginCatalogKeys.all(organizationId) }),
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
