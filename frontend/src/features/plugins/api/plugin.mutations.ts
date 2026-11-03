/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mutationOptions, useMutation, type QueryClient } from "@tanstack/react-query";
import { PLUGIN_RUNTIME_SOURCES_QUERY_KEY } from "@/capabilities/prediction-runtime/plugins/plugin-runtime-sources";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { deletePlugin, uploadPlugin } from "./plugin.api";
import { pluginCatalogKeys } from "./plugin.keys";

const invalidatePluginQueries = async (client: QueryClient, organizationId: number | string) => {
  await Promise.all([
    client.invalidateQueries({ queryKey: pluginCatalogKeys.all(organizationId) }),
    client.invalidateQueries({ queryKey: PLUGIN_RUNTIME_SOURCES_QUERY_KEY(organizationId) }),
  ]);
};

const pluginMutation = <TData, TVariables>(
  organizationId: number | string,
  mutationFn: (variables: TVariables) => Promise<TData>,
) =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    mutationFn,
    onSuccess: (_data, _variables, _result, { client }) =>
      invalidatePluginQueries(client, organizationId),
  });

export const useUploadPluginMutation = () =>
  useMutation(pluginMutation(useCurrentOrganizationId() ?? "none", uploadPlugin));

export const useDeletePluginMutation = () =>
  useMutation(pluginMutation(useCurrentOrganizationId() ?? "none", deletePlugin));
